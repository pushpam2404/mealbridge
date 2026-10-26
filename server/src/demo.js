import { Listing } from './models/Listing.js';
import { User } from './models/User.js';

// Demo accounts and "live" listing templates shared by the seed script and demo mode.
export const HOUR = 3600 * 1000;
export const at = (ms) => new Date(Date.now() + ms);

export const users = [
  { key: 'spice', name: 'Ananya Rao', email: 'donor@mealbridge.app', role: 'donor', organization: 'Spice Route Kitchen', phone: '+91 98200 11223', city: 'Pune' },
  { key: 'crumb', name: 'Farhan Sheikh', email: 'bakery@mealbridge.app', role: 'donor', organization: 'Crumb & Co. Bakery', phone: '+91 98450 33221', city: 'Bengaluru' },
  { key: 'hostel', name: 'Meera Iyer', email: 'hostel@mealbridge.app', role: 'donor', organization: 'Sahyadri Boys Hostel Mess', phone: '+91 99300 55667', city: 'Pune' },
  { key: 'grand', name: 'Rohit Malhotra', email: 'hotel@mealbridge.app', role: 'donor', organization: 'The Grand Orchid Hotel', phone: '+91 98110 77889', city: 'Mumbai' },
  { key: 'roti', name: 'Kavya Nair', email: 'ngo@mealbridge.app', role: 'receiver', organization: 'Roti Bank Foundation', phone: '+91 97300 99001', city: 'Pune' },
  { key: 'hope', name: 'Arjun Das', email: 'shelter@mealbridge.app', role: 'receiver', organization: 'Hope Night Shelter', phone: '+91 96190 44556', city: 'Mumbai' },
  { key: 'feed', name: 'Sana Qureshi', email: 'volunteer@mealbridge.app', role: 'receiver', organization: 'Feed Bengaluru Volunteers', phone: '+91 95910 22334', city: 'Bengaluru' },
];

// [donorKey, title, description, category, foodType, quantity, unit, servings, allergens, address, city, startOffset, windowHours, shelfHours]
export const live = [
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

export const toListing = (id, [donor, title, description, category, foodType, quantity, unit, estServings, allergens, pickupAddress, city, start, windowH, shelfH]) => ({
  donor: id[donor], title, description, category, foodType, quantity, unit, estServings, allergens, pickupAddress, city,
  pickupStart: at(start),
  pickupEnd: at(start + windowH * HOUR),
  expiresAt: at(start + shelfH * HOUR),
});

const REFRESH_EVERY = 5 * 60 * 1000;
let lastRefresh = 0;

// DEMO_MODE keeps the public demo alive: any demo listing that has expired, been
// picked up or been deleted is re-posted with fresh pickup times. Throttled per instance.
export async function ensureDemoListings({ force = false } = {}) {
  if (process.env.DEMO_MODE !== 'true') return 0;
  if (!force && Date.now() - lastRefresh < REFRESH_EVERY) return 0;
  lastRefresh = Date.now();

  const donors = await User.find({ email: { $in: users.filter((u) => u.role === 'donor').map((u) => u.email) } }).select('email');
  if (!donors.length) return 0;
  const id = Object.fromEntries(donors.map((d) => [users.find((u) => u.email === d.email).key, d._id]));

  const active = await Listing.find({ donor: { $in: donors.map((d) => d._id) }, status: { $in: ['available', 'claimed'] } }).select('donor title');
  const has = new Set(active.map((l) => `${l.donor}|${l.title}`));
  const missing = live.filter((row) => id[row[0]] && !has.has(`${id[row[0]]}|${row[1]}`));
  if (missing.length) await Listing.insertMany(missing.map((row) => toListing(id, row)));
  return missing.length;
}
