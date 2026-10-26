import mongoose from 'mongoose';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, `No route for ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof mongoose.Error.CastError) {
    err = new HttpError(400, `Invalid ${err.path}`);
  } else if (err?.code === 11000) {
    err = new HttpError(409, 'An account with this email already exists', { email: 'Already registered' });
  } else if (err?.type === 'entity.parse.failed') {
    err = new HttpError(400, 'Request body is not valid JSON');
  } else if (err?.type === 'entity.too.large') {
    err = new HttpError(413, 'Request body is too large');
  }

  const status = err instanceof HttpError ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    error: status === 500 ? 'Something went wrong on our side. Try again in a moment.' : err.message,
    ...(err.details && { fields: err.details }),
  });
}
