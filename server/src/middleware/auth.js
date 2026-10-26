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

export const SESSION_COOKIE = 'mb_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

const cookieValue = (req, name) => {
  for (const part of (req.get('cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
};

// The browser app signs in with an httpOnly cookie, so page scripts never hold the token.
export const setSessionCookie = (req, res, token) =>
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: SESSION_MAX_AGE_MS, path: '/' });

export const clearSessionCookie = (req, res) =>
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });

// Cookies ride along on cross-site requests, so a state-changing request authenticated by
// the cookie must come from this site. SameSite=Lax already blocks most cross-site posts;
// this is the second check.
function assertSameSite(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const site = req.get('sec-fetch-site');
  if (site) {
    if (site === 'same-origin') return;
  } else {
    const origin = req.get('origin');
    if (origin && new URL(origin).host === req.get('host')) return;
  }
  throw new HttpError(403, 'This request did not come from MealBridge');
}

export async function requireAuth(req, _res, next) {
  const header = req.get('authorization') ?? '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    token = cookieValue(req, SESSION_COOKIE);
    if (token) assertSameSite(req);
  }
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
  if (!req.get('authorization') && !cookieValue(req, SESSION_COOKIE)) return next();
  try {
    await requireAuth(req, res, () => {});
  } catch {
    req.user = undefined;
  }
  next();
}
