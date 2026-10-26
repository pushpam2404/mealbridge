import mongoose from 'mongoose';

// Serverless functions reuse the module between invocations, so cache the
// connection promise on globalThis instead of reconnecting on every request.
const cache = globalThis.__mongoose ?? (globalThis.__mongoose = { conn: null, promise: null });

export async function connectDB(uri = process.env.MONGODB_URI) {
  if (cache.conn) return cache.conn;
  if (!uri) throw new Error('MONGODB_URI is not set');
  cache.promise ??= mongoose
    .connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 })
    .catch((err) => {
      cache.promise = null;
      throw err;
    });
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
