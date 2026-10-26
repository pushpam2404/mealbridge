import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { api, clearDB, registerUser, startDB, stopDB } from './helpers.js';

beforeAll(startDB);
afterAll(stopDB);
beforeEach(clearDB);

describe('auth', () => {
  it('registers a user and never returns the password hash', async () => {
    const { token, user } = await registerUser('donor', { email: 'Chef@Example.com' });
    expect(token).toBeTypeOf('string');
    expect(user.email).toBe('chef@example.com');
    expect(user.passwordHash).toBeUndefined();
  });

  it('rejects invalid registration with field errors', async () => {
    const res = await api().post('/api/auth/register').send({ email: 'nope', password: '123', role: 'admin' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(['name', 'email', 'password', 'role']));
  });

  it('rejects duplicate emails with 409', async () => {
    await registerUser('donor', { email: 'dup@test.dev' });
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Again', email: 'dup@test.dev', password: 'password123', role: 'receiver' });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await registerUser('receiver', { email: 'ngo@test.dev' });
    const ok = await api().post('/api/auth/login').send({ email: 'ngo@test.dev', password: 'password123' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.role).toBe('receiver');

    const bad = await api().post('/api/auth/login').send({ email: 'ngo@test.dev', password: 'wrongpass' });
    expect(bad.status).toBe(401);
  });

  it('returns the current user from a token and 401 without one', async () => {
    const { auth, user } = await registerUser('donor');
    const me = await api().get('/api/auth/me').set(auth);
    expect(me.body.user._id).toBe(user._id);

    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set({ Authorization: 'Bearer junk' })).status).toBe(401);
  });

  it('updates the profile', async () => {
    const { auth } = await registerUser('donor');
    const res = await api().patch('/api/auth/me').set(auth).send({ organization: 'Hotel Sunrise' });
    expect(res.body.user.organization).toBe('Hotel Sunrise');
  });

  it('keeps profile fields the update does not mention', async () => {
    const { auth } = await registerUser('donor', { organization: 'Hotel Sunrise', phone: '+91 90000 00000' });
    const res = await api().patch('/api/auth/me').set(auth).send({ city: 'Mumbai' });
    expect(res.body.user).toMatchObject({ city: 'Mumbai', organization: 'Hotel Sunrise', phone: '+91 90000 00000' });
  });

  it('treats operator objects in login fields as invalid input, not as queries', async () => {
    await registerUser('donor', { email: 'real@test.dev' });
    const res = await api().post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  it('rejects tokens that are unsigned, signed with another key or expired', async () => {
    const { user } = await registerUser('donor');
    const forged = [
      jwt.sign({ sub: user._id }, 'not-the-secret'),
      jwt.sign({ sub: user._id }, 'test-secret', { expiresIn: -10 }),
      `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user._id })).toString('base64url')}.`,
    ];
    for (const token of forged) {
      const res = await api().get('/api/auth/me').set({ Authorization: `Bearer ${token}` });
      expect(res.status).toBe(401);
    }
  });

  it('refuses fields a profile update should not touch', async () => {
    const { auth } = await registerUser('donor');
    const res = await api().patch('/api/auth/me').set(auth).send({ role: 'receiver', email: 'x@test.dev' });
    expect(res.status).toBe(400);
  });

  it('answers 413 to oversized bodies instead of a server error', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'a@test.dev', password: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
  });
});
