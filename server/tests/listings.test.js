import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Listing } from '../src/models/Listing.js';
import { api, clearDB, listingInput, registerUser, startDB, stopDB } from './helpers.js';

beforeAll(startDB);
afterAll(stopDB);

let donor, otherDonor, receiver, otherReceiver;
beforeEach(async () => {
  await clearDB();
  donor = await registerUser('donor');
  otherDonor = await registerUser('donor');
  receiver = await registerUser('receiver');
  otherReceiver = await registerUser('receiver');
});

const create = (overrides, who = donor) =>
  api().post('/api/listings').set(who.auth).send(listingInput(overrides));

describe('listing CRUD', () => {
  it('lets a donor create a listing', async () => {
    const res = await create();
    expect(res.status).toBe(201);
    expect(res.body.listing).toMatchObject({ title: 'Veg biryani trays', status: 'available' });
    expect(res.body.listing.donor.name).toBe(donor.user.name);
  });

  it('blocks receivers and anonymous users from creating', async () => {
    expect((await create({}, receiver)).status).toBe(403);
    expect((await api().post('/api/listings').send(listingInput())).status).toBe(401);
  });

  it('validates timing rules', async () => {
    const res = await create({
      pickupStart: new Date(Date.now() + 3 * 3600e3).toISOString(),
      pickupEnd: new Date(Date.now() + 3600e3).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty('pickupEnd');
    expect(res.body.fields).toHaveProperty('expiresAt');
  });

  it('lists available listings with filters, search and pagination', async () => {
    await create({ title: 'Croissants', category: 'bakery', city: 'Mumbai', estServings: 10 });
    await create({ title: 'Paneer curry', foodType: 'veg', estServings: 25 });
    await create({ title: 'Chicken curry', foodType: 'non-veg', estServings: 30 });

    const all = await api().get('/api/listings');
    expect(all.body.total).toBe(3);

    const bakery = await api().get('/api/listings?category=bakery');
    expect(bakery.body.items.map((l) => l.title)).toEqual(['Croissants']);

    const search = await api().get('/api/listings?q=curry&sort=largest');
    expect(search.body.items.map((l) => l.title)).toEqual(['Chicken curry', 'Paneer curry']);

    const city = await api().get('/api/listings?city=mumbai');
    expect(city.body.total).toBe(1);

    const paged = await api().get('/api/listings?limit=2&page=2');
    expect(paged.body).toMatchObject({ page: 2, pages: 2 });
    expect(paged.body.items).toHaveLength(1);

    expect((await api().get('/api/listings?sort=random')).status).toBe(400);
  });

  it('reads a single listing and 404s / 400s on bad ids', async () => {
    const { body } = await create();
    const res = await api().get(`/api/listings/${body.listing._id}`);
    expect(res.body.listing.title).toBe('Veg biryani trays');
    expect(res.body.listing.donor.phone).toBeUndefined();

    expect((await api().get('/api/listings/64b000000000000000000000')).status).toBe(404);
    expect((await api().get('/api/listings/not-an-id')).status).toBe(400);
  });

  it('lets only the owner update, and validates the merged result', async () => {
    const { body } = await create();
    const id = body.listing._id;

    const ok = await api().patch(`/api/listings/${id}`).set(donor.auth).send({ title: 'Veg pulao trays', quantity: 8 });
    expect(ok.status).toBe(200);
    expect(ok.body.listing).toMatchObject({ title: 'Veg pulao trays', quantity: 8 });

    expect((await api().patch(`/api/listings/${id}`).set(otherDonor.auth).send({ title: 'Hijack' })).status).toBe(403);

    const bad = await api()
      .patch(`/api/listings/${id}`)
      .set(donor.auth)
      .send({ pickupEnd: new Date(Date.now() + 10 * 3600e3).toISOString() });
    expect(bad.status).toBe(400);
    expect(bad.body.fields).toHaveProperty('expiresAt');

    expect((await api().patch(`/api/listings/${id}`).set(donor.auth).send({ status: 'completed' })).status).toBe(400);
  });

  it('lets only the owner delete', async () => {
    const { body } = await create();
    const id = body.listing._id;
    expect((await api().delete(`/api/listings/${id}`).set(otherDonor.auth)).status).toBe(403);
    expect((await api().delete(`/api/listings/${id}`).set(donor.auth)).status).toBe(204);
    expect((await api().get(`/api/listings/${id}`)).status).toBe(404);
  });
});

describe('claim lifecycle', () => {
  it('runs claim → complete and shares contacts only with the parties', async () => {
    const { body } = await create();
    const id = body.listing._id;

    const claim = await api().post(`/api/listings/${id}/claim`).set(receiver.auth);
    expect(claim.status).toBe(200);
    expect(claim.body.listing.status).toBe('claimed');
    expect(claim.body.listing.donor.email).toBe(donor.user.email);

    expect((await api().post(`/api/listings/${id}/claim`).set(otherReceiver.auth)).status).toBe(409);
    expect((await api().patch(`/api/listings/${id}`).set(donor.auth).send({ title: 'Changed' })).status).toBe(409);
    expect((await api().delete(`/api/listings/${id}`).set(donor.auth)).status).toBe(409);

    const asDonor = await api().get(`/api/listings/${id}`).set(donor.auth);
    expect(asDonor.body.listing.claimedBy.email).toBe(receiver.user.email);
    const asStranger = await api().get(`/api/listings/${id}`).set(otherReceiver.auth);
    expect(asStranger.body.listing.claimedBy).not.toHaveProperty('email');

    expect((await api().post(`/api/listings/${id}/complete`).set(otherReceiver.auth)).status).toBe(403);
    const done = await api().post(`/api/listings/${id}/complete`).set(receiver.auth);
    expect(done.body.listing.status).toBe('completed');
    expect(done.body.listing.completedAt).toBeTruthy();
  });

  it('only lets one of two simultaneous claims win', async () => {
    const { body } = await create();
    const id = body.listing._id;
    const results = await Promise.all([
      api().post(`/api/listings/${id}/claim`).set(receiver.auth),
      api().post(`/api/listings/${id}/claim`).set(otherReceiver.auth),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it('lets the claimer release a claim', async () => {
    const { body } = await create();
    const id = body.listing._id;
    await api().post(`/api/listings/${id}/claim`).set(receiver.auth).expect(200);
    expect((await api().post(`/api/listings/${id}/unclaim`).set(otherReceiver.auth)).status).toBe(409);
    const res = await api().post(`/api/listings/${id}/unclaim`).set(receiver.auth);
    expect(res.body.listing).toMatchObject({ status: 'available', claimedBy: null });
  });

  it('lets the donor cancel', async () => {
    const { body } = await create();
    const res = await api().post(`/api/listings/${body.listing._id}/cancel`).set(donor.auth);
    expect(res.body.listing.status).toBe('cancelled');
  });

  it('expires stale listings on read and refuses to claim them', async () => {
    const { body } = await create();
    await Listing.updateOne({ _id: body.listing._id }, { expiresAt: new Date(Date.now() - 1000) });

    const list = await api().get('/api/listings');
    expect(list.body.total).toBe(0);
    const expired = await api().get('/api/listings?status=expired');
    expect(expired.body.total).toBe(1);
    expect((await api().post(`/api/listings/${body.listing._id}/claim`).set(receiver.auth)).status).toBe(409);
  });

  it('shows each user their own listings or claims under /mine', async () => {
    const a = await create({ title: 'Mine' });
    await create({ title: 'Theirs' }, otherDonor);
    await api().post(`/api/listings/${a.body.listing._id}/claim`).set(receiver.auth);

    const donorMine = await api().get('/api/listings/mine').set(donor.auth);
    expect(donorMine.body.items.map((l) => l.title)).toEqual(['Mine']);
    const receiverMine = await api().get('/api/listings/mine').set(receiver.auth);
    expect(receiverMine.body.items.map((l) => l.title)).toEqual(['Mine']);
    expect((await api().get('/api/listings/mine').set(otherReceiver.auth)).body.items).toHaveLength(0);
  });
});
