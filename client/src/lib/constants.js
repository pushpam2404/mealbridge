import { Apple, Croissant, CupSoda, Milk, Package, Soup } from 'lucide-react';

export const CATEGORIES = {
  cooked: { label: 'Cooked meals', icon: Soup },
  bakery: { label: 'Bakery', icon: Croissant },
  produce: { label: 'Fruit & veg', icon: Apple },
  packaged: { label: 'Packaged', icon: Package },
  dairy: { label: 'Dairy', icon: Milk },
  beverages: { label: 'Drinks', icon: CupSoda },
};

export const FOOD_TYPES = {
  veg: 'Veg',
  'non-veg': 'Non-veg',
  vegan: 'Vegan',
};

export const UNITS = {
  kg: 'kg',
  servings: 'servings',
  items: 'items',
};

export const STATUS = {
  available: { label: 'Available', tone: 'lime' },
  claimed: { label: 'Claimed', tone: 'amber' },
  completed: { label: 'Picked up', tone: 'leaf' },
  expired: { label: 'Expired', tone: 'muted' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

export const ALLERGENS = ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'shellfish', 'sesame'];

export const DEMO = {
  donor: { email: 'donor@mealbridge.app', password: 'demo1234' },
  receiver: { email: 'ngo@mealbridge.app', password: 'demo1234' },
};
