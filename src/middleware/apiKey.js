import pool from '../config/database.js';
import redisClient from '../config/redis.js';

export async function apiKeyMiddleware(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    let keyData = null;
    
    // Check cache first (if Redis available)
    if (redisClient) {
      const cached = await redisClient.get(`apikey:${apiKey}`);
      if (cached) {
        keyData = JSON.parse(cached);
      }
    }
    
    if (!keyData) {
      // Query database
      const result = await pool.query(
        `SELECT ak.*, u.email 
         FROM api_keys ak 
         JOIN users u ON ak.user_id = u.id 
         WHERE ak.key_value = $1 AND ak.is_active = true`,
        [apiKey]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      keyData = result.rows[0];
      
      // Cache for 5 minutes (if Redis available)
      if (redisClient) {
        await redisClient.setEx(
          `apikey:${apiKey}`,
          300,
          JSON.stringify(keyData)
        );
      }
    }
    
    // Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(401).json({ error: 'API key expired' });
    }
    
    // Rate limiting (if Redis available)
    if (redisClient) {
      const rateLimitKey = `ratelimit:${apiKey}`;
      const requests = await redisClient.incr(rateLimitKey);
      
      if (requests === 1) {
        await redisClient.expire(rateLimitKey, 60); // 1 minute window
      }
      
      if (requests > keyData.rate_limit) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          limit: keyData.rate_limit,
          window: '1 minute'
        });
      }
    }
    
    // Update last used
    await pool.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [keyData.id]
    );
    
    req.apiKey = keyData;
    next();
  } catch (error) {
    console.error('API key middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
