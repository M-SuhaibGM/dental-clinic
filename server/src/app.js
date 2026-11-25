import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import api from './routes/index.js';
import { errorHandler, notFound } from './middleware/errors.js';

export function createApp() {
  const app = express();

  const origins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
  app.use(cors(origins ? { origin: origins } : undefined));
  app.use(express.json({ limit: '100kb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.use('/api', api);
  app.use('/api', notFound);

  const dist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*splat}', (req, res) => res.sendFile('index.html', { root: dist })); // SPA fallback for react-router
  }

  app.use(errorHandler);
  return app;
}
