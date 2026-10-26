import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/db.js';

let mongod;

export async function startDB() {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri());
}

export async function stopDB() {
  await disconnectDB();
  await mongod?.stop();
}

export async function clearDB() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export const app = createApp({ connect: async () => {} });
export const api = () => request(app);

let counter = 0;
export async function registerUser(role, overrides = {}) {
  counter += 1;
  const body = {
    name: `${role} ${counter}`,
    email: `${role}${counter}@test.dev`,
    password: 'password123',
    role,
    city: 'Pune',
    ...overrides,
  };
  const res = await api().post('/api/auth/register').send(body).expect(201);
  return { ...res.body, auth: { Authorization: `Bearer ${res.body.token}` } };
}

const hours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

export const listingInput = (overrides = {}) => ({
  title: 'Veg biryani trays',
  description: 'Left over from a wedding lunch, packed in foil trays.',
  category: 'cooked',
  foodType: 'veg',
  quantity: 12,
  unit: 'kg',
  estServings: 40,
  allergens: ['nuts'],
  pickupAddress: '12 FC Road, Shivajinagar',
  city: 'Pune',
  pickupStart: hours(0.5),
  pickupEnd: hours(3),
  expiresAt: hours(6),
  ...overrides,
});
