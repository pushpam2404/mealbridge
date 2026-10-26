import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, clearDB, listingInput, registerUser, startDB, stopDB } from './helpers.js';

beforeAll(async () => {
  await startDB();
  await clearDB();
});
afterAll(stopDB);

describe('stats', () => {
  it('reports impact only from completed pickups', async () => {
    const donor = await registerUser('donor');
    const receiver = await registerUser('receiver');

    const make = (o) => api().post('/api/listings').set(donor.auth).send(listingInput(o));
    const a = await make({ unit: 'kg', quantity: 10, estServings: 30, category: 'cooked' });
    const b = await make({ unit: 'items', quantity: 20, estServings: 20, category: 'bakery' });
    await make({ estServings: 99 }); // stays available, must not count

    for (const l of [a, b]) {
      const id = l.body.listing._id;
      await api().post(`/api/listings/${id}/claim`).set(receiver.auth).expect(200);
      await api().post(`/api/listings/${id}/complete`).set(donor.auth).expect(200);
    }

    const { body } = await api().get('/api/stats').expect(200);
    // 10 kg + 20 servings × 0.4 kg = 18 kg; 18 × 2.5 = 45 kg CO2e
    expect(body.totals).toMatchObject({ meals: 50, kg: 18, co2: 45, pickups: 2 });
    expect(body.availableNow).toBe(1);
    expect(body.community).toEqual({ donors: 1, receivers: 1 });
    expect(body.byCategory.map((c) => c.category)).toEqual(['cooked', 'bakery']);
    expect(body.weekly.at(-1).meals).toBe(50);

    const mine = await api().get('/api/stats/me').set(receiver.auth).expect(200);
    expect(mine.body.impact.meals).toBe(50);
    expect(mine.body.byStatus).toEqual({ completed: 2 });
  });

  it('serves a health check and JSON 404s', async () => {
    expect((await api().get('/api/health')).body.ok).toBe(true);
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No route/);
  });
});
