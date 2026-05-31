import express from 'express';
import { nanoid } from 'nanoid';
import pool from '../config/database.js';
import redisClient from '../config/redis.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Generate new API key
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, rateLimit = 100, expiresInDays, metadata = {} } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Key name required' });
    }
    
    const keyValue = `sk_${nanoid(32)}`;
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    
    const result = await pool.query(
      `INSERT INTO api_keys 
       (user_id, key_value, name, rate_limit, expires_at, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [req.user.userId, keyValue, name, rateLimit, expiresAt, JSON.stringify(metadata)]
    );
    
    const apiKey = result.rows[0];
    
    res.status(201).json({
      message: 'API key created successfully',
      apiKey: {
        id: apiKey.id,
        key: keyValue, // Only shown once!
        name: apiKey.name,
        rateLimit: apiKey.rate_limit,
        expiresAt: apiKey.expires_at,
        createdAt: apiKey.created_at
      }
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// List user's API keys
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, rate_limit, is_active, last_used_at, created_at, expires_at, 
              LEFT(key_value, 8) || '...' as key_preview
       FROM api_keys 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.userId]
    );
    
    res.json({ apiKeys: result.rows });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// Get specific API key details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, rate_limit, is_active, last_used_at, created_at, expires_at, metadata,
              LEFT(key_value, 8) || '...' as key_preview
       FROM api_keys 
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json({ apiKey: result.rows[0] });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({ error: 'Failed to get API key' });
  }
});

// Update API key
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, rateLimit, isActive, metadata } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (rateLimit !== undefined) {
      updates.push(`rate_limit = $${paramCount++}`);
      values.push(rateLimit);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(metadata));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(req.params.id, req.user.userId);
    
    const result = await pool.query(
      `UPDATE api_keys 
       SET ${updates.join(', ')} 
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING id, name, rate_limit, is_active, metadata`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    // Invalidate cache
    const keyResult = await pool.query(
      'SELECT key_value FROM api_keys WHERE id = $1',
      [req.params.id]
    );
    
    if (keyResult.rows.length > 0) {
      await redisClient.del(`apikey:${keyResult.rows[0].key_value}`);
    }
    
    res.json({
      message: 'API key updated successfully',
      apiKey: result.rows[0]
    });
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// Delete (revoke) API key
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Get key value before deleting
    const keyResult = await pool.query(
      'SELECT key_value FROM api_keys WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    
    if (keyResult.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    await pool.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    
    // Invalidate cache
    await redisClient.del(`apikey:${keyResult.rows[0].key_value}`);
    
    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// Admin: List all API keys
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ak.id, ak.name, ak.rate_limit, ak.is_active, ak.last_used_at, 
              ak.created_at, ak.expires_at, u.email,
              LEFT(ak.key_value, 8) || '...' as key_preview
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       ORDER BY ak.created_at DESC`
    );
    
    res.json({ apiKeys: result.rows });
  } catch (error) {
    console.error('Admin list API keys error:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

export default router;
