import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Listing } from '../src/models/Listing.js';
import { User } from '../src/models/User.js';
import { ensureDemoListings, live, users } from '../src/demo.js';
import { api, startDB, stopDB } from './helpers.js';

beforeAll(async () => {
  await startDB();
  const passwordHash = await User.hashPassword('demo1234');
  await User.insertMany(users.map(({ key, ...u }) => ({ ...u, passwordHash })));
});
afterAll(async () => {
  delete process.env.DEMO_MODE;
  await stopDB();
});

describe('demo mode', () => {
  it('does nothing unless DEMO_MODE is on', async () => {
    expect(await ensureDemoListings({ force: true })).toBe(0);
    expect(await Listing.countDocuments()).toBe(0);
  });

  it('re-posts demo listings that are no longer active, with fresh times', async () => {
    process.env.DEMO_MODE = 'true';
    expect(await ensureDemoListings({ force: true })).toBe(live.length);

    const one = await Listing.findOne({ title: live[0][1] });
    await Listing.updateOne({ _id: one._id }, { expiresAt: new Date(Date.now() - 1000) });

    const res = await api().get('/api/listings?limit=50');
    // The stale copy expires on read; the throttle means the refresh waits for the next window.
    expect(res.body.total).toBe(live.length - 1);

    expect(await ensureDemoListings({ force: true })).toBe(1);
    const fresh = await Listing.findOne({ title: live[0][1], status: 'available' });
    expect(+fresh.expiresAt).toBeGreaterThan(Date.now());
    expect(await ensureDemoListings({ force: true })).toBe(0);
  });
});
