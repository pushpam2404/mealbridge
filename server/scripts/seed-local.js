// Spins up a throwaway in-memory MongoDB, seeds it and runs the API against it.
// Handy for trying the app without installing MongoDB: npm run dev:memory
import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';

const mongod = await MongoMemoryServer.create({ instance: { port: 27018 } });
process.env.MONGODB_URI = mongod.getUri('mealbridge');
process.env.JWT_SECRET ??= 'local-dev-secret';
const { seed } = await import('./seed.js');
await seed();

const server = spawn(process.execPath, ['server/server.js'], { stdio: 'inherit', env: process.env });
const stop = async () => {
  server.kill();
  await mongod.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
