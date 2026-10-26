// Resets the database and fills it with demo accounts and listings.
// Usage: MONGODB_URI=... npm run seed
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../src/db.js';
import { User } from '../src/models/User.js';
import { Listing } from '../src/models/Listing.js';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const at = (ms) => new Date(Date.now() + ms);
export const DEMO_PASSWORD = 'demo1234';

const users = [
  { key: 'spice', name: 'Ananya Rao', email: 'donor@mealbridge.app', role: 'donor', organization: 'Spice Route Kitchen', phone: '+91 98200 11223', city: 'Pune' },
  { key: 'crumb', name: 'Farhan Sheikh', email: 'bakery@mealbridge.app', role: 'donor', organization: 'Crumb & Co. Bakery', phone: '+91 98450 33221', city: 'Bengaluru' },
  { key: 'hostel', name: 'Meera Iyer', email: 'hostel@mealbridge.app', role: 'donor', organization: 'Sahyadri Boys Hostel Mess', phone: '+91 99300 55667', city: 'Pune' },
  { key: 'grand', name: 'Rohit Malhotra', email: 'hotel@mealbridge.app', role: 'donor', organization: 'The Grand Orchid Hotel', phone: '+91 98110 77889', city: 'Mumbai' },
  { key: 'roti', name: 'Kavya Nair', email: 'ngo@mealbridge.app', role: 'receiver', organization: 'Roti Bank Foundation', phone: '+91 97300 99001', city: 'Pune' },
  { key: 'hope', name: 'Arjun Das', email: 'shelter@mealbridge.app', role: 'receiver', organization: 'Hope Night Shelter', phone: '+91 96190 44556', city: 'Mumbai' },
  { key: 'feed', name: 'Sana Qureshi', email: 'volunteer@mealbridge.app', role: 'receiver', organization: 'Feed Bengaluru Volunteers', phone: '+91 95910 22334', city: 'Bengaluru' },
];

// [donorKey, title, description, category, foodType, quantity, unit, servings, allergens, address, city, startOffset, windowHours, shelfHours]
const live = [
  ['spice', 'Paneer butter masala with jeera rice', 'Two full hotel pans from a cancelled corporate lunch. Kept hot in the bain-marie until pickup.', 'cooked', 'veg', 14, 'kg', 45, ['dairy', 'nuts'], 'Shop 4, Lane 6, Koregaon Park', 'Pune', 0.25 * HOUR, 3, 5],
  ['hostel', 'Dal tadka, chapatis and mixed veg', 'Dinner surplus from the hostel mess. Packed in steel containers; please return them next visit.', 'cooked', 'veg', 60, 'servings', 60, ['gluten'], 'Sahyadri Hostel, Gate 2, Karve Nagar', 'Pune', 0.5 * HOUR, 2.5, 4],
  ['crumb', 'Day-old sourdough and multigrain loaves', 'Perfectly good bread that did not sell today. Great for breakfast service tomorrow.', 'bakery', 'vegan', 32, 'items', 64, ['gluten'], '88, 12th Main, Indiranagar', 'Bengaluru', 1 * HOUR, 4, 30],
  ['crumb', 'Assorted croissants and muffins', 'Butter croissants, banana muffins and a few chocolate danishes.', 'bakery', 'veg', 40, 'items', 40, ['gluten', 'dairy', 'eggs'], '88, 12th Main, Indiranagar', 'Bengaluru', 0.5 * HOUR, 3, 20],
  ['grand', 'Banquet buffet: biryani, raita and salad', 'Surplus from a wedding reception for 300 guests. Food handled to hotel FSSAI standards.', 'cooked', 'non-veg', 25, 'kg', 80, ['dairy'], 'The Grand Orchid, Juhu Tara Road', 'Mumbai', 0.25 * HOUR, 2, 4],
  ['grand', 'Fresh fruit platters', 'Cut watermelon, papaya and pineapple from the breakfast buffet. Refrigerated.', 'produce', 'vegan', 8, 'kg', 30, [], 'The Grand Orchid, Juhu Tara Road', 'Mumbai', 1 * HOUR, 3, 6],
  ['spice', 'Sealed packs of basmati rice and atta', 'Overstock from our store room, well within the printed expiry dates.', 'packaged', 'vegan', 50, 'kg', 160, ['gluten'], 'Shop 4, Lane 6, Koregaon Park', 'Pune', 2 * HOUR, 26, 24 * 30],
  ['hostel', 'Curd and buttermilk', 'Twenty 1 L tubs of fresh curd made this morning plus buttermilk pouches.', 'dairy', 'veg', 20, 'kg', 50, ['dairy'], 'Sahyadri Hostel, Gate 2, Karve Nagar', 'Pune', 1 * HOUR, 5, 10],
  ['grand', 'Packaged juice and water bottles', 'Leftover stock from a conference. 200 ml juice tetra packs and 500 ml water bottles.', 'beverages', 'vegan', 120, 'items', 120, [], 'The Grand Orchid, Juhu Tara Road', 'Mumbai', 3 * HOUR, 20, 24 * 60],
  ['spice', 'Vegetable pulao and chole', 'Lunch thali components, freshly cooked at 1 pm.', 'cooked', 'vegan', 9, 'kg', 30, [], 'Shop 4, Lane 6, Koregaon Park', 'Pune', 4 * HOUR, 2, 7],
];

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

  const toListing = ([donor, title, description, category, foodType, quantity, unit, estServings, allergens, pickupAddress, city, start, windowH, shelfH]) => ({
    donor: id[donor], title, description, category, foodType, quantity, unit, estServings, allergens, pickupAddress, city,
    pickupStart: at(start),
    pickupEnd: at(start + windowH * HOUR),
    expiresAt: at(start + shelfH * HOUR),
  });

  const docs = [
    ...live.map((row, i) => ({ ...toListing(row), status: 'available', createdAt: at(-(i + 1) * 17 * 60 * 1000), updatedAt: at(-(i + 1) * 17 * 60 * 1000) })),
    ...claimed.map((row) => ({ ...toListing(row), status: 'claimed', claimedBy: id[row[14]], claimedAt: at(-20 * 60 * 1000), createdAt: at(-2 * HOUR), updatedAt: at(-20 * 60 * 1000) })),
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
