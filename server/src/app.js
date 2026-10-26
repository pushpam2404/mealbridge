import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import statsRoutes from './routes/stats.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp({ connect = connectDB } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (_req, res) => {
    let db = 'connected';
    try {
      await connect();
    } catch {
      db = 'unreachable';
    }
    res.status(db === 'connected' ? 200 : 503).json({ ok: db === 'connected', db, time: new Date().toISOString() });
  });

  // Make sure the (cached) database connection is ready before any data route runs.
  app.use('/api', async (_req, _res, next) => {
    await connect();
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/listings', listingRoutes);
  app.use('/api/stats', statsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export default createApp();
