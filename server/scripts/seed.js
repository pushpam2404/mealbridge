// Resets the database and fills it with demo accounts and listings.
// Usage: MONGODB_URI=... npm run seed
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../src/db.js';
import { User } from '../src/models/User.js';
import { Listing } from '../src/models/Listing.js';
import { HOUR, at, live, toListing, users } from '../src/demo.js';

const DAY = 24 * HOUR;
export const DEMO_PASSWORD = 'demo1234';

const claimed = [
  ['spice', 'Idli, sambar and chutney', 'Breakfast surplus, packed in disposable containers.', 'cooked', 'vegan', 70, 'servings', 70, [], 'Shop 4, Lane 6, Koregaon Park', 'Pune', -0.5 * HOUR, 3, 4, 'roti'],
  ['crumb', 'Burger buns and pav', 'Unsold buns from the evening batch.', 'bakery', 'vegan', 60, 'items', 60, ['gluten'], '88, 12th Main, Indiranagar', 'Bengaluru', 0, 3, 24, 'feed'],
];

const completedTemplates = [
  ['spice', 'Rajma chawal', 'cooked', 'veg', 12, 'kg', 40, 'Pune', 'roti'],
  ['hostel', 'Mess dinner surplus', 'cooked', 'veg', 80, 'servings', 80, 'Pune', 'roti'],
  ['crumb', 'Bread loaves', 'bakery', 'vegan', 30, 'items', 60, 'Bengaluru', 'feed'],
  ['grand', 'Banquet leftovers', 'cooked', 'non-veg', 30, 'kg', 95, 'Mumbai', 'hope'],
  ['grand', 'Fruit and salad', 'produce', 'vegan', 10, 'kg', 35, 'Mumbai', 'hope'],
  ['hostel', 'Milk packets', 'dairy', 'veg', 25, 'items', 25, 'Pune', 'roti'],
  ['spice', 'Packaged dal and rice', 'packaged', 'vegan', 20, 'kg', 65, 'Pune', 'roti'],
  ['crumb', 'Cakes and pastries', 'bakery', 'veg', 24, 'items', 24, 'Bengaluru', 'feed'],
];

export async function seed({ disconnect = true } = {}) {
  await connectDB();
  console.log('Resetting users and listings…');
  await Promise.all([User.deleteMany({}), Listing.deleteMany({})]);

  const passwordHash = await User.hashPassword(DEMO_PASSWORD);
  const created = await User.insertMany(users.map(({ key, ...u }) => ({ ...u, passwordHash })));
  const id = Object.fromEntries(users.map((u, i) => [u.key, created[i]._id]));

  const docs = [
    ...live.map((row, i) => ({ ...toListing(id, row), status: 'available', createdAt: at(-(i + 1) * 17 * 60 * 1000), updatedAt: at(-(i + 1) * 17 * 60 * 1000) })),
    ...claimed.map((row) => ({ ...toListing(id, row), status: 'claimed', claimedBy: id[row[14]], claimedAt: at(-20 * 60 * 1000), createdAt: at(-2 * HOUR), updatedAt: at(-20 * 60 * 1000) })),
  ];

  // Ten weeks of completed pickups so the impact charts have history.
  for (let week = 9; week >= 0; week -= 1) {
    const perWeek = 2 + ((week * 7) % 4);
    for (let n = 0; n < perWeek; n += 1) {
      const [donor, title, category, foodType, quantity, unit, servings, city, receiver] =
        completedTemplates[(week * 3 + n) % completedTemplates.length];
      const done = at(-(week * 7 + n + 1) * DAY + 3 * HOUR);
      const scale = 0.7 + ((week + n) % 5) * 0.15;
      docs.push({
        donor: id[donor], title, description: 'Picked up and served the same day.', category, foodType,
        quantity: Math.round(quantity * scale), unit, estServings: Math.round(servings * scale), allergens: [],
        pickupAddress: users.find((u) => u.key === donor).organization, city,
        pickupStart: new Date(done - 2 * HOUR), pickupEnd: done, expiresAt: new Date(+done + 3 * HOUR),
        status: 'completed', claimedBy: id[receiver], claimedAt: new Date(done - 90 * 60 * 1000), completedAt: done,
        createdAt: new Date(done - 3 * HOUR), updatedAt: done,
      });
    }
  }

  await Listing.insertMany(docs, { timestamps: false });
  await Listing.syncIndexes();

  console.log(`Seeded ${created.length} users and ${docs.length} listings.`);
  console.log(`Demo logins (password "${DEMO_PASSWORD}"): donor@mealbridge.app, ngo@mealbridge.app`);
  if (disconnect) await disconnectDB();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch(async (err) => {
    console.error(err);
    await disconnectDB();
    process.exit(1);
  });
}
