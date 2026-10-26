import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';

const secret = () => {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not set');
  return value;
};

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, secret(), { algorithm: 'HS256', expiresIn: '7d' });

export async function requireAuth(req, _res, next) {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Sign in to continue');

  let payload;
  try {
    payload = jwt.verify(token, secret(), { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Your session has expired. Sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  req.user = user;
  next();
}

export const requireRole = (role) => (req, _res, next) => {
  if (req.user?.role !== role) {
    throw new HttpError(403, `Only ${role} accounts can do this`);
  }
  next();
};

// Attaches req.user when a valid token is present but never rejects the request.
export async function optionalAuth(req, res, next) {
  if (!req.get('authorization')) return next();
  try {
    await requireAuth(req, res, () => {});
  } catch {
    req.user = undefined;
  }
  next();
}
