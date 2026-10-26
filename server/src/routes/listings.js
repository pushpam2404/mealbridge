import { Router } from 'express';
import { z } from 'zod';
import { Listing, CATEGORIES, FOOD_TYPES, UNITS, STATUSES } from '../models/Listing.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError, notFound } from '../utils/httpError.js';

const router = Router();

const DONOR_FIELDS = 'name organization city';
const CONTACT_FIELDS = 'name organization city phone email';

const listingFields = z.object({
  title: z.string().trim().min(3, 'Give it a short title (at least 3 characters)').max(100),
  description: z.string().trim().max(1000).optional().default(''),
  category: z.enum(CATEGORIES, { error: 'Pick a category' }),
  foodType: z.enum(FOOD_TYPES, { error: 'Pick veg, non-veg or vegan' }),
  quantity: z.coerce.number({ error: 'Enter a quantity' }).positive('Quantity must be more than 0').max(100000),
  unit: z.enum(UNITS, { error: 'Pick a unit' }),
  estServings: z.coerce.number({ error: 'Estimate how many people this feeds' }).int('Use a whole number').min(1, 'Must feed at least 1 person').max(100000),
  allergens: z.array(z.string().trim().min(1).max(30)).max(10).optional().default([]),
  imageUrl: z.union([z.url('Enter a full image URL starting with https://'), z.literal('')]).optional().default(''),
  pickupAddress: z.string().trim().min(5, 'Enter the pickup address').max(200),
  city: z.string().trim().min(2, 'Enter the city').max(60),
  pickupStart: z.coerce.date({ error: 'Enter when pickup can start' }),
  pickupEnd: z.coerce.date({ error: 'Enter when pickup must end' }),
  expiresAt: z.coerce.date({ error: 'Enter when the food stops being safe to eat' }),
});

const timingRules = (data, ctx) => {
  if (data.pickupEnd <= data.pickupStart) {
    ctx.addIssue({ code: 'custom', path: ['pickupEnd'], message: 'Pickup must end after it starts' });
  }
  if (data.expiresAt <= new Date()) {
    ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Best-before time must be in the future' });
  }
  if (data.expiresAt < data.pickupEnd) {
    ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Food must stay fresh until pickup ends' });
  }
};

const listingSchema = listingFields.superRefine(timingRules);
const listingPatch = listingFields.partial().strict('Some of these fields cannot be edited');

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum([...STATUSES, 'all']).optional().default('available'),
  category: z.enum(CATEGORIES).optional(),
  foodType: z.enum(FOOD_TYPES).optional(),
  city: z.string().trim().max(60).optional(),
  sort: z.enum(['expiring', 'newest', 'largest']).optional().default('expiring'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

const SORTS = {
  expiring: { expiresAt: 1 },
  newest: { createdAt: -1 },
  largest: { estServings: -1 },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function loadListing(id) {
  const listing = await Listing.findById(id);
  if (!listing) throw notFound('Listing');
  return listing;
}

const isOwner = (listing, user) => user && listing.donor.equals(user._id);
const isClaimer = (listing, user) => user && listing.claimedBy?.equals(user._id);

// READ (collection) with filtering, search, sorting and pagination
router.get('/', validate(querySchema, 'query'), async (req, res) => {
  await Listing.expireStale();
  const { q, status, category, foodType, city, sort, page, limit } = req.validQuery;

  const filter = {};
  if (status !== 'all') filter.status = status;
  if (category) filter.category = category;
  if (foodType) filter.foodType = foodType;
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { city: rx }, { pickupAddress: rx }];
  }

  const [items, total] = await Promise.all([
    Listing.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('donor', DONOR_FIELDS),
    Listing.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/cities', async (_req, res) => {
  const cities = await Listing.distinct('city', { status: 'available' });
  res.json({ cities: cities.sort((a, b) => a.localeCompare(b)) });
});

router.get('/mine', requireAuth, async (req, res) => {
  await Listing.expireStale();
  const filter = req.user.role === 'donor' ? { donor: req.user._id } : { claimedBy: req.user._id };
  const items = await Listing.find(filter)
    .sort({ updatedAt: -1 })
    .populate('donor', CONTACT_FIELDS)
    .populate('claimedBy', CONTACT_FIELDS);
  res.json({ items });
});

// READ (single)
router.get('/:id', optionalAuth, async (req, res) => {
  await Listing.expireStale();
  const listing = await loadListing(req.params.id);
  // Contact details are only shared between the donor and the receiver who claimed it.
  const canSeeContacts = isOwner(listing, req.user) || isClaimer(listing, req.user);
  await listing.populate('donor', canSeeContacts ? CONTACT_FIELDS : DONOR_FIELDS);
  if (canSeeContacts) await listing.populate('claimedBy', CONTACT_FIELDS);
  res.json({ listing });
});

// CREATE
router.post('/', requireAuth, requireRole('donor'), validate(listingSchema), async (req, res) => {
  const listing = await Listing.create({ ...req.body, donor: req.user._id });
  await listing.populate('donor', DONOR_FIELDS);
  res.status(201).json({ listing });
});

// UPDATE
router.patch('/:id', requireAuth, requireRole('donor'), validate(listingPatch), async (req, res) => {
  const listing = await loadListing(req.params.id);
  if (!isOwner(listing, req.user)) throw new HttpError(403, 'You can only edit your own listings');
  if (listing.status !== 'available') {
    throw new HttpError(409, `This listing is ${listing.status} and can no longer be edited`);
  }

  const merged = listingSchema.safeParse({ ...listing.toObject(), ...req.body });
  if (!merged.success) {
    const fields = {};
    for (const issue of merged.error.issues) fields[issue.path.join('.')] ??= issue.message;
    throw new HttpError(400, 'Some fields need fixing', fields);
  }

  listing.set(req.body);
  await listing.save();
  await listing.populate('donor', DONOR_FIELDS);
  res.json({ listing });
});

// DELETE
router.delete('/:id', requireAuth, requireRole('donor'), async (req, res) => {
  const listing = await loadListing(req.params.id);
  if (!isOwner(listing, req.user)) throw new HttpError(403, 'You can only delete your own listings');
  if (listing.status === 'claimed') {
    throw new HttpError(409, 'Someone is on their way to collect this. Cancel it instead of deleting.');
  }
  await listing.deleteOne();
  res.status(204).end();
});

router.post('/:id/claim', requireAuth, requireRole('receiver'), async (req, res) => {
  await Listing.expireStale();
  // Atomic: only one receiver can win the race for an available listing.
  const listing = await Listing.findOneAndUpdate(
    { _id: req.params.id, status: 'available' },
    { $set: { status: 'claimed', claimedBy: req.user._id, claimedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!listing) {
    const existing = await loadListing(req.params.id);
    throw new HttpError(409, `This listing is already ${existing.status}`);
  }
  await listing.populate('donor', CONTACT_FIELDS);
  res.json({ listing });
});

router.post('/:id/unclaim', requireAuth, requireRole('receiver'), async (req, res) => {
  const listing = await loadListing(req.params.id);
  if (listing.status !== 'claimed' || !isClaimer(listing, req.user)) {
    throw new HttpError(409, 'You have not claimed this listing');
  }
  listing.set({
    status: listing.expiresAt <= new Date() ? 'expired' : 'available',
    claimedBy: null,
    claimedAt: null,
  });
  await listing.save();
  await listing.populate('donor', DONOR_FIELDS);
  res.json({ listing });
});

router.post('/:id/complete', requireAuth, async (req, res) => {
  const listing = await loadListing(req.params.id);
  if (!isOwner(listing, req.user) && !isClaimer(listing, req.user)) {
    throw new HttpError(403, 'Only the donor or the receiver can confirm pickup');
  }
  if (listing.status !== 'claimed') {
    throw new HttpError(409, 'Only claimed listings can be marked as picked up');
  }
  listing.set({ status: 'completed', completedAt: new Date() });
  await listing.save();
  await listing.populate([{ path: 'donor', select: CONTACT_FIELDS }, { path: 'claimedBy', select: CONTACT_FIELDS }]);
  res.json({ listing });
});

router.post('/:id/cancel', requireAuth, requireRole('donor'), async (req, res) => {
  const listing = await loadListing(req.params.id);
  if (!isOwner(listing, req.user)) throw new HttpError(403, 'You can only cancel your own listings');
  if (!['available', 'claimed'].includes(listing.status)) {
    throw new HttpError(409, `This listing is already ${listing.status}`);
  }
  listing.status = 'cancelled';
  await listing.save();
  res.json({ listing });
});

export default router;
