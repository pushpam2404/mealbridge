import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User, ROLES } from '../models/User.js';
import { clearSessionCookie, requireAuth, setSessionCookie, signToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many attempts. Wait a few minutes and try again.' },
});

const profileFields = {
  name: z.string().trim().min(2, 'Enter your name (at least 2 characters)').max(80),
  organization: z.string().trim().max(120),
  phone: z.string().trim().max(20),
  city: z.string().trim().max(60),
};

const registerSchema = z.object({
  name: profileFields.name,
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Use at least 8 characters').max(72),
  role: z.enum(ROLES, { error: 'Choose whether you donate or receive food' }),
  organization: profileFields.organization.optional().default(''),
  phone: profileFields.phone.optional().default(''),
  city: profileFields.city.optional().default(''),
});

const loginSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Enter your password').max(200),
});

const profileSchema = z.object(profileFields).partial().strict('Some of these fields cannot be edited');

const session = (user, req, res) => {
  const token = signToken(user);
  setSessionCookie(req, res, token);
  return { token, user: user.toJSON() };
};

router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { password, ...fields } = req.body;
  const user = await User.create({ ...fields, passwordHash: await User.hashPassword(password) });
  res.status(201).json(session(user, req, res));
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  if (!user || !(await user.checkPassword(req.body.password))) {
    throw new HttpError(401, 'Email or password is incorrect');
  }
  res.json(session(user, req, res));
});

router.post('/logout', (req, res) => {
  clearSessionCookie(req, res);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.patch('/me', requireAuth, validate(profileSchema), async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json({ user: req.user });
});

export default router;
