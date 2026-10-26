import mongoose from 'mongoose';

export const CATEGORIES = ['cooked', 'bakery', 'produce', 'packaged', 'dairy', 'beverages'];
export const FOOD_TYPES = ['veg', 'non-veg', 'vegan'];
export const UNITS = ['kg', 'servings', 'items'];
export const STATUSES = ['available', 'claimed', 'completed', 'expired', 'cancelled'];

const listingSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    category: { type: String, enum: CATEGORIES, required: true },
    foodType: { type: String, enum: FOOD_TYPES, required: true },
    quantity: { type: Number, required: true, min: 0.1 },
    unit: { type: String, enum: UNITS, required: true },
    estServings: { type: Number, required: true, min: 1 },
    allergens: { type: [String], default: [] },
    imageUrl: { type: String, trim: true, default: '' },
    pickupAddress: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    pickupStart: { type: Date, required: true },
    pickupEnd: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: 'available' },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    claimedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

listingSchema.index({ status: 1, city: 1, expiresAt: 1 });
listingSchema.index({ title: 'text', description: 'text', city: 'text' });

listingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

// Listings past their expiry are flipped lazily on read, so no cron job is needed.
listingSchema.statics.expireStale = function expireStale() {
  return this.updateMany(
    { status: 'available', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired' } },
  );
};

export const Listing = mongoose.models.Listing ?? mongoose.model('Listing', listingSchema);
