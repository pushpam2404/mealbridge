import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, Mail, MapPin, Phone, Store, Timer } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { CATEGORIES, UNITS } from '../lib/constants';
import { fmtAgo, fmtDay, fmtDayInline, fmtNumber, fmtTime, fmtWindow, freshness, pickupCode } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useNow';
import { useAuth } from '../context/AuthContext';
import { FoodMark } from '../components/FoodMark';
import { StatusStamp } from '../components/StatusStamp';
import { ConfirmDialog } from '../components/Modal';
import { ACTIONS } from '../lib/actions';
import { Button, Container, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

function Contact({ title, person }) {
  if (!person?.email) return null;
  return (
    <div className="rounded-xl bg-surface-2 p-4">
      <p className="text-sm text-ink-soft">{title}</p>
      <p className="mt-1 font-semibold">{person.organization || person.name}</p>
      {person.organization && <p className="text-sm text-ink-soft">{person.name}</p>}
      <div className="mt-3 flex flex-col gap-1.5 text-sm">
        {person.phone && (
          <a className="flex items-center gap-2 font-medium text-leaf hover:underline" href={`tel:${person.phone.replace(/\s/g, '')}`}>
            <Phone className="size-4" aria-hidden />
            {person.phone}
          </a>
        )}
        <a className="flex items-center gap-2 font-medium text-leaf hover:underline" href={`mailto:${person.email}`}>
          <Mail className="size-4" aria-hidden />
          {person.email}
        </a>
      </div>
    </div>
  );
}

function ActionPanel({ listing, onChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const isOwner = user && listing.donor?._id === user._id;
  const isClaimer = user && listing.claimedBy?._id === user._id;
  const { status } = listing;

  const run = async () => {
    const action = ACTIONS[pending];
    setBusy(true);
    try {
      await action.run(listing._id);
      toast.success(action.done);
      if (pending === 'delete') navigate('/dashboard', { replace: true });
      else await onChange();
      setPending(null);
    } catch (err) {
      toast.error(err.message);
      setPending(null);
      if (err.status === 409) onChange();
    } finally {
      setBusy(false);
    }
  };

  let content;
  if (!user && status === 'available') {
    content = (
      <>
        <p className="text-ink-soft">Sign in as an NGO or volunteer to claim this pickup.</p>
        <Button to="/login" state={{ from: location.pathname }} size="lg" className="w-full">
          Sign in to claim
        </Button>
        <p className="text-center text-sm text-ink-soft">
          New here?{' '}
          <Link to="/register?role=receiver" className="font-semibold text-leaf hover:underline">
            Create a receiver account
          </Link>
        </p>
      </>
    );
  } else if (user?.role === 'receiver' && status === 'available') {
    content = (
      <>
        <p className="text-ink-soft">Claim it if you can collect during the pickup window.</p>
        <Button size="lg" className="w-full" onClick={() => setPending('claim')}>
          Claim this pickup
        </Button>
      </>
    );
  } else if (isClaimer && status === 'claimed') {
    content = (
      <>
        <div className="rounded-xl bg-lime p-4 text-on-lime">
          <p className="text-sm font-medium">Your pickup code</p>
          <p className="display num text-4xl tracking-wider">{pickupCode(listing._id)}</p>
          <p className="mt-1 text-sm">Show this to the donor when you collect.</p>
        </div>
        <Contact title="Collect from" person={listing.donor} />
        <Button size="lg" className="w-full" onClick={() => setPending('complete')}>
          I’ve collected it
        </Button>
        <Button variant="danger-ghost" className="w-full" onClick={() => setPending('unclaim')}>
          I can’t make it, release the claim
        </Button>
      </>
    );
  } else if (isOwner && status === 'available') {
    content = (
      <>
        <p className="text-ink-soft">Waiting for an NGO to claim it. You can still make changes.</p>
        <Button to={`/listings/${listing._id}/edit`} size="lg" className="w-full">
          Edit listing
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setPending('cancel')}>
            Cancel listing
          </Button>
          <Button variant="danger-ghost" onClick={() => setPending('delete')}>
            Delete
          </Button>
        </div>
      </>
    );
  } else if (isOwner && status === 'claimed') {
    content = (
      <>
        <p className="text-ink-soft">
          Claimed {fmtAgo(listing.claimedAt)}. Ask for pickup code{' '}
          <strong className="num text-ink">{pickupCode(listing._id)}</strong> when they arrive.
        </p>
        <Contact title="Being collected by" person={listing.claimedBy} />
        <Button size="lg" className="w-full" onClick={() => setPending('complete')}>
          Mark as picked up
        </Button>
        <Button variant="danger-ghost" className="w-full" onClick={() => setPending('cancel')}>
          Cancel listing
        </Button>
      </>
    );
  } else if (status === 'completed') {
    content = (
      <p className="text-ink-soft">
        Picked up {fmtDayInline(listing.completedAt)} at {fmtTime(listing.completedAt)}.{' '}
        {fmtNumber(listing.estServings)} people were fed from this listing.
      </p>
    );
  } else if (status === 'claimed') {
    content = <p className="text-ink-soft">Another organisation has claimed this and is on the way.</p>;
  } else if (status === 'expired') {
    content = <p className="text-ink-soft">The best-before time passed before anyone could collect it.</p>;
  } else if (status === 'cancelled') {
    content = <p className="text-ink-soft">The donor cancelled this listing.</p>;
  } else {
    content = <p className="text-ink-soft">Only NGO and volunteer accounts can claim food.</p>;
  }

  const action = pending && ACTIONS[pending];
  return (
    <aside className="ticket p-6 lg:sticky lg:top-24" aria-label="Pickup">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Pickup</h2>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={status}
            initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.45, visualDuration: 0.35 }}
          >
            <StatusStamp status={status} />
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="flex flex-col gap-3">{content}</div>
      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => !busy && setPending(null)}
        onConfirm={run}
        loading={busy}
        title={action?.title}
        confirmLabel={action?.confirm}
        tone={action?.tone}
      >
        {action?.body}
      </ConfirmDialog>
    </aside>
  );
}

export default function ListingDetail() {
  const { id } = useParams();
  const now = useNow();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.listing(id), [id, user?._id]);
  const listing = data?.listing;
  useTitle(listing?.title ?? 'Listing');

  if (loading && !listing) {
    return (
      <Container className="grid gap-8 py-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-14 w-4/5" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </Container>
    );
  }
  if (error) {
    return (
      <Container className="py-12">
        {error.status === 404 || error.status === 400 ? (
          <EmptyState title="This listing doesn’t exist" action={<Button to="/browse">Browse open listings</Button>}>
            It may have been deleted by the donor.
          </EmptyState>
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </Container>
    );
  }

  const Category = CATEGORIES[listing.category];
  const fresh = freshness(listing.expiresAt, now);
  const live = ['available', 'claimed'].includes(listing.status);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.pickupAddress}, ${listing.city}`)}`;

  return (
    <Container className="py-8 sm:py-12">
      <Link to="/browse" className="inline-flex items-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        All listings
      </Link>

      <div className="mt-4 grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
        <article className="ticket">
          <div className="p-6 sm:p-8">
            <p className="flex items-center gap-2 text-ink-soft">
              <Category.icon className="size-5" aria-hidden />
              {Category.label}
              <span className="text-line" aria-hidden>
                |
              </span>
              <span className="text-sm">Posted {fmtAgo(listing.createdAt, now)}</span>
            </p>
            <h1 className="display mt-3 text-4xl sm:text-5xl">{listing.title}</h1>
            {listing.donor?.organization && (
              <p className="mt-3 flex items-center gap-2 text-lg">
                <Store className="size-5 text-ink-soft" aria-hidden />
                {listing.donor.organization}
              </p>
            )}
            {listing.description && <p className="mt-5 max-w-prose text-lg text-ink-soft">{listing.description}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface-2 px-3 py-1.5">
                <FoodMark type={listing.foodType} />
              </span>
              {listing.allergens.map((a) => (
                <span key={a} className="rounded-full bg-amber-soft px-3 py-1.5 text-sm font-medium text-amber">
                  Contains {a}
                </span>
              ))}
            </div>
          </div>

          <div className="ticket-tear" aria-hidden />

          <dl className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <dt className="text-sm text-ink-soft">Pickup window</dt>
              <dd className="num mt-1 text-xl font-bold">{fmtWindow(listing.pickupStart, listing.pickupEnd, new Date(now))}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Best before</dt>
              <dd className="num mt-1 text-xl font-bold">
                {fmtDay(listing.expiresAt, new Date(now))}, {fmtTime(listing.expiresAt)}
              </dd>
              {live && (
                <dd className={clsx('mt-1 flex items-center gap-1.5 text-sm font-semibold', fresh.urgency === 'urgent' ? 'text-tomato' : fresh.urgency === 'soon' ? 'text-amber' : 'text-ink-soft')}>
                  <Timer className="size-4" aria-hidden />
                  {fresh.label}
                </dd>
              )}
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Quantity</dt>
              <dd className="num mt-1 text-xl font-bold">
                {fmtNumber(listing.quantity)} {UNITS[listing.unit]}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Feeds about</dt>
              <dd className="num mt-1 text-xl font-bold">{fmtNumber(listing.estServings)} people</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-ink-soft">Pickup address</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="size-5 shrink-0 text-ink-soft" aria-hidden />
                  {listing.pickupAddress}, {listing.city}
                </span>
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-leaf hover:underline">
                  Open in Maps
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </dd>
            </div>
          </dl>
        </article>

        <ActionPanel listing={listing} onChange={reload} />
      </div>
    </Container>
  );
}
