import { forwardRef } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { MapPin, Store, Timer } from 'lucide-react';
import { CATEGORIES, UNITS } from '../lib/constants';
import { fmtDayInline, fmtNumber, fmtTime, freshness } from '../lib/format';
import { FoodMark } from './FoodMark';
import { StatusStamp } from './StatusStamp';

const urgencyTone = {
  urgent: 'text-tomato',
  soon: 'text-amber',
  fine: 'text-ink-soft',
  gone: 'text-ink-soft',
};

// A listing rendered as a kitchen pickup ticket. The whole ticket is one link.
export const Ticket = forwardRef(function Ticket({ listing, now, className, headingLevel: H = 'h3', style }, ref) {
  const Category = CATEGORIES[listing.category];
  const fresh = freshness(listing.expiresAt, now);
  const live = listing.status === 'available' || listing.status === 'claimed';

  return (
    <article ref={ref} style={style} className={clsx('ticket group flex flex-col', className)}>
      <div className="flex flex-1 flex-col gap-3 p-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft">
            <Category.icon className="size-4" aria-hidden />
            {Category.label}
          </span>
          <StatusStamp status={listing.status} />
        </div>

        <H className="text-xl leading-snug font-bold">
          <Link
            to={`/listings/${listing._id}`}
            className="after:absolute after:inset-0 after:rounded-[10px] after:content-[''] group-hover:text-leaf focus-visible:outline-none group-has-[a:focus-visible]:after:outline-3 group-has-[a:focus-visible]:after:outline-leaf"
          >
            {listing.title}
          </Link>
        </H>

        <div className="space-y-1 text-sm text-ink-soft">
          {listing.donor?.organization && (
            <p className="flex items-center gap-1.5">
              <Store className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{listing.donor.organization}</span>
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {listing.pickupAddress.split(',').at(-1).trim()}, {listing.city}
            </span>
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <FoodMark type={listing.foodType} />
          {listing.allergens?.length > 0 && (
            <span className="text-sm text-ink-soft">Contains {listing.allergens.join(', ')}</span>
          )}
        </div>
      </div>

      <div className="ticket-tear" aria-hidden />

      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 p-5 pt-4">
        <div>
          <p className="text-xs font-medium text-ink-soft">Pickup {fmtDayInline(listing.pickupStart, new Date(now))}</p>
          <p className="num text-lg font-bold">
            {fmtTime(listing.pickupStart)} – {fmtTime(listing.pickupEnd)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-ink-soft">
            {fmtNumber(listing.quantity)} {UNITS[listing.unit]}
          </p>
          <p className="num text-lg font-bold">Feeds {fmtNumber(listing.estServings)}</p>
        </div>
        {live && (
          <p className={clsx('col-span-2 flex items-center gap-1.5 text-sm font-semibold', urgencyTone[fresh.urgency])}>
            <Timer className="size-4" aria-hidden />
            <span className="num">{fresh.urgency === 'gone' ? fresh.label : `Best before ${fmtTime(listing.expiresAt)}, ${fresh.label}`}</span>
          </p>
        )}
      </div>
    </article>
  );
});

export function TicketSkeleton() {
  return (
    <div className="ticket flex flex-col" aria-hidden>
      <div className="space-y-3 p-5">
        <div className="flex justify-between">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
        <div className="skeleton h-6 w-4/5" />
        <div className="skeleton h-4 w-3/5" />
        <div className="skeleton h-4 w-2/5" />
      </div>
      <div className="ticket-tear" />
      <div className="flex justify-between p-5">
        <div className="skeleton h-10 w-32" />
        <div className="skeleton h-10 w-20" />
      </div>
    </div>
  );
}
