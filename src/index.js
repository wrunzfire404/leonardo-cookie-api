import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import keysRoutes from './routes/keys.js';
import leonardoRoutes from './routes/leonardo.js';

// Import config
import pool from './config/database.js';
import redisClient from './config/redis.js';
import leonardoClient from './leonardo/client.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Serve Web UI
app.use('/ui', express.static(path.join(__dirname, '../web-ui')));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    
    let redisStatus = 'not available';
    if (redisClient) {
      try {
        await redisClient.ping();
        redisStatus = 'connected';
      } catch (err) {
        redisStatus = 'error';
      }
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: redisStatus,
      leonardo_accounts: leonardoClient.accounts.length,
      auth_method: 'cookies'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/keys', keysRoutes);
app.use('/api', leonardoRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Leonardo Cookie API System',
    version: '1.0.0',
    auth_method: 'cookies',
    accounts: leonardoClient.accounts.length,
    endpoints: {
      auth: '/api/auth',
      keys: '/api/keys',
      generate: '/api/generate',
      models: '/api/models',
      test_cookies: '/api/test-cookies',
      health: '/health',
      ui: '/ui'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   Leonardo Cookie API System v1.0.0   ║
╚═══════════════════════════════════════╝

🚀 Server running on port ${PORT}
📝 Environment: ${process.env.NODE_ENV || 'development'}
🔗 API: http://localhost:${PORT}
🎨 Web UI: http://localhost:${PORT}/ui
💚 Health: http://localhost:${PORT}/health

🍪 Auth Method: Cookies
👥 Leonardo Accounts: ${leonardoClient.accounts.length}

Ready to generate! 🎨
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  if (redisClient) await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  await pool.end();
  if (redisClient) await redisClient.quit();
  process.exit(0);
});
