import clsx from 'clsx';
import { FOOD_TYPES } from '../lib/constants';

// The square veg / non-veg symbol printed on food packaging in India.
export function FoodMark({ type, withLabel = true, className }) {
  const nonVeg = type === 'non-veg';
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-sm font-medium', className)}>
      <span
        aria-hidden
        className={clsx(
          'grid size-4 place-items-center rounded-[3px] border-[1.5px]',
          nonVeg ? 'border-nonveg' : 'border-veg',
        )}
      >
        {nonVeg ? (
          <span className="size-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-nonveg" />
        ) : (
          <span className="size-2 rounded-full bg-veg" />
        )}
      </span>
      {withLabel ? FOOD_TYPES[type] : <span className="sr-only">{FOOD_TYPES[type]}</span>}
    </span>
  );
}
