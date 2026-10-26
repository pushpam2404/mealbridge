import { Router } from 'express';
import { Listing } from '../models/Listing.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { KG_PER_SERVING, summarize } from '../utils/impact.js';
import { ensureDemoListings } from '../demo.js';

const router = Router();

const kgExpr = {
  $cond: [{ $eq: ['$unit', 'kg'] }, '$quantity', { $multiply: ['$estServings', KG_PER_SERVING] }],
};

const totalsPipeline = (match) => [
  { $match: match },
  { $group: { _id: null, servings: { $sum: '$estServings' }, kg: { $sum: kgExpr }, pickups: { $sum: 1 } } },
];

async function impactFor(match) {
  const [totals] = await Listing.aggregate(totalsPipeline(match));
  const { _id, ...rest } = totals ?? { servings: 0, kg: 0, pickups: 0 };
  return summarize(rest);
}

router.get('/', async (_req, res) => {
  await Listing.expireStale();
  await ensureDemoListings();
  const rescued = { status: 'completed' };
  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 24 * 3600 * 1000);

  const [totals, byCategory, weekly, availableNow, inTransit, donors, receivers] = await Promise.all([
    impactFor(rescued),
    Listing.aggregate([
      { $match: rescued },
      { $group: { _id: '$category', servings: { $sum: '$estServings' }, kg: { $sum: kgExpr } } },
      { $sort: { servings: -1 } },
    ]),
    Listing.aggregate([
      { $match: { ...rescued, completedAt: { $gte: twelveWeeksAgo } } },
      {
        $group: {
          _id: { $dateTrunc: { date: '$completedAt', unit: 'week', startOfWeek: 'monday' } },
          servings: { $sum: '$estServings' },
          kg: { $sum: kgExpr },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Listing.countDocuments({ status: 'available' }),
    Listing.countDocuments({ status: 'claimed' }),
    User.countDocuments({ role: 'donor' }),
    User.countDocuments({ role: 'receiver' }),
  ]);

  res.json({
    totals,
    availableNow,
    inTransit,
    community: { donors, receivers },
    byCategory: byCategory.map(({ _id, ...rest }) => summarize({ category: _id, ...rest })),
    weekly: weekly.map(({ _id, ...rest }) => summarize({ week: _id, ...rest })),
  });
});

router.get('/me', requireAuth, async (req, res) => {
  await Listing.expireStale();
  const key = req.user.role === 'donor' ? 'donor' : 'claimedBy';
  const [impact, counts] = await Promise.all([
    impactFor({ [key]: req.user._id, status: 'completed' }),
    Listing.aggregate([{ $match: { [key]: req.user._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const byStatus = Object.fromEntries(counts.map(({ _id, n }) => [_id, n]));
  res.json({ impact, byStatus });
});

export default router;
