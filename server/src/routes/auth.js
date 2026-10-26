import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User, ROLES } from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';
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

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name (at least 2 characters)').max(80),
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Use at least 8 characters').max(72),
  role: z.enum(ROLES, { error: 'Choose whether you donate or receive food' }),
  organization: z.string().trim().max(120).optional().default(''),
  phone: z.string().trim().max(20).optional().default(''),
  city: z.string().trim().max(60).optional().default(''),
});

const loginSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Enter your password'),
});

const profileSchema = registerSchema.pick({ name: true, organization: true, phone: true, city: true }).partial();

const session = (user) => ({ token: signToken(user), user: user.toJSON() });

router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { password, ...fields } = req.body;
  const user = await User.create({ ...fields, passwordHash: await User.hashPassword(password) });
  res.status(201).json(session(user));
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  if (!user || !(await user.checkPassword(req.body.password))) {
    throw new HttpError(401, 'Email or password is incorrect');
  }
  res.json(session(user));
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
