import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
});
