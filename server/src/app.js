import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { AppError, errorHandler, notFound } from './middleware/error.js';
import { requireAuth } from './middleware/auth.js';
import { verifyToken, createUserClient } from './services/supabase.js';
import * as ai from './services/ai.js';
import documentsRouter from './routes/documents.js';
import { chatRouter, messagesRouter } from './routes/chat.js';
import { quizzesRouter } from './routes/quizzes.js';
import { statsRouter } from './routes/stats.js';

const rateLimitMessage = {
  error: { code: 'RATE_LIMIT', message: 'Demasiadas peticiones, espera un momento e inténtalo de nuevo' },
};

export function createApp(deps = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Puntos de extensión para tests (IA y Supabase se inyectan con mocks).
  app.locals.verifyToken = deps.verifyToken ?? verifyToken;
  app.locals.createUserClient = deps.createUserClient ?? createUserClient;
  app.locals.ai = deps.ai ?? ai;

  const origins = config.clientOrigins;
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || origins.includes(origin)) return cb(null, true);
        cb(new AppError(403, 'CORS_FORBIDDEN', `Origen no permitido: ${origin}`));
      },
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', uptime: process.uptime(), version: '1.0.0' }),
  );

  const chatLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: rateLimitMessage });
  const quizLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: rateLimitMessage });

  // Todas las rutas /api exigen JWT; req.sb apunta con RLS al usuario.
  app.use('/api', requireAuth);
  app.use('/api/documents', documentsRouter);
  app.use('/api/chat', chatLimiter, chatRouter);
  app.use('/api/chats', messagesRouter);
  app.use('/api/quizzes', quizLimiter, quizzesRouter);
  app.use('/api/stats', statsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
