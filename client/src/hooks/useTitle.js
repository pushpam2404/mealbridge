import { useEffect } from 'react';

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | MealBridge` : 'MealBridge: rescue surplus food, feed people nearby';
  }, [title]);
}
