import { ZodError } from 'zod';

/** Error with an HTTP status, thrown from controllers and turned into JSON below. */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (req, res) =>
  res.status(404).json({ error: { message: `Route ${req.method} ${req.originalUrl} not found` } });

// Centralized error handler: every error leaves the API as { error: { message, details? } }.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const details = Object.fromEntries(err.issues.map((i) => [i.path.join('.') || 'body', i.message]));
    return res.status(400).json({ error: { message: 'Validation failed', details } });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  }
  // Postgres constraint violations
  if (err.code === '23505') return res.status(409).json({ error: { message: 'A record with this email already exists', details: { email: 'Already in use' } } });
  if (err.code === '23503') return res.status(409).json({ error: { message: 'This record is referenced by other records' } });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { message: 'Malformed JSON body' } });

  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
}
