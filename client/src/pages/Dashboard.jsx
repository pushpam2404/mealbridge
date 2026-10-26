import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { ClipboardList, Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { ACTIONS } from '../lib/actions';
import { CATEGORIES, UNITS } from '../lib/constants';
import { fmtNumber, fmtWindow, freshness, pickupCode } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useNow';
import { useAuth } from '../context/AuthContext';
import { StatusStamp } from '../components/StatusStamp';
import { ConfirmDialog } from '../components/Modal';
import { Button, Container, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

const TABS = {
  donor: [
    { key: 'open', label: 'Waiting for a claim', statuses: ['available'] },
    { key: 'claimed', label: 'Being collected', statuses: ['claimed'] },
    { key: 'history', label: 'History', statuses: ['completed', 'expired', 'cancelled'] },
  ],
  receiver: [
    { key: 'claimed', label: 'To collect', statuses: ['claimed'] },
    { key: 'history', label: 'Collected', statuses: ['completed', 'expired', 'cancelled'] },
  ],
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function ImpactLedger({ role }) {
  const { data, loading } = useAsync(() => api.myStats(), []);
  const items = data
    ? [
        { label: role === 'donor' ? 'Meals donated' : 'Meals collected', value: fmtNumber(data.impact.meals) },
        { label: 'Food rescued', value: `${fmtNumber(data.impact.kg)} kg` },
        { label: 'CO₂e avoided', value: `${fmtNumber(Math.round(data.impact.co2))} kg` },
        { label: 'Completed pickups', value: fmtNumber(data.impact.pickups) },
      ]
    : [];
  return (
    <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
      {loading
        ? Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-surface p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-16" />
            </div>
          ))
        : items.map((it) => (
            <div key={it.label} className="bg-surface p-5">
              <dt className="text-sm text-ink-soft">{it.label}</dt>
              <dd className="display num mt-1 text-3xl">{it.value}</dd>
            </div>
          ))}
    </dl>
  );
}

function ContactLine({ person }) {
  if (!person?.email) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="font-semibold">{person.organization || person.name}</span>
      {person.phone && (
        <a href={`tel:${person.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 font-medium text-leaf hover:underline">
          <Phone className="size-3.5" aria-hidden />
          {person.phone}
        </a>
      )}
      <a href={`mailto:${person.email}`} className="inline-flex items-center gap-1 font-medium text-leaf hover:underline">
        <Mail className="size-3.5" aria-hidden />
        Email
      </a>
    </div>
  );
}

function Row({ listing, role, now, onAction }) {
  const Category = CATEGORIES[listing.category];
  const fresh = freshness(listing.expiresAt, now);
  const { status } = listing;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', bounce: 0, visualDuration: 0.25 }}
      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
    >
      <div className="hidden size-11 shrink-0 place-items-center rounded-lg bg-surface-2 sm:grid">
        <Category.icon className="size-5 text-ink-soft" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/listings/${listing._id}`} className="text-lg font-bold hover:text-leaf">
            {listing.title}
          </Link>
          <StatusStamp status={status} />
        </div>
        <p className="num text-sm text-ink-soft">
          {fmtWindow(listing.pickupStart, listing.pickupEnd, new Date(now))}
          <span aria-hidden> | </span>
          {fmtNumber(listing.quantity)} {UNITS[listing.unit]}, feeds {fmtNumber(listing.estServings)}
          {status === 'available' && fresh.urgency !== 'gone' && (
            <span className={clsx('font-semibold', fresh.urgency === 'urgent' ? 'text-tomato' : fresh.urgency === 'soon' && 'text-amber')}>
              <span aria-hidden> | </span>
              {fresh.label}
            </span>
          )}
        </p>
        {status === 'claimed' && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="num rounded-md bg-lime px-2 py-0.5 text-sm font-bold tracking-wider text-on-lime">
              {pickupCode(listing._id)}
            </span>
            <ContactLine person={role === 'donor' ? listing.claimedBy : listing.donor} />
          </div>
        )}
        {role === 'receiver' && status !== 'claimed' && listing.donor?.organization && (
          <p className="text-sm text-ink-soft">From {listing.donor.organization}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {role === 'donor' && status === 'available' && (
          <>
            <Button to={`/listings/${listing._id}/edit`} variant="secondary" size="sm">
              <Pencil className="size-4" aria-hidden />
              Edit
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => onAction('delete', listing)}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          </>
        )}
        {status === 'claimed' && (
          <Button size="sm" onClick={() => onAction('complete', listing)}>
            {role === 'donor' ? 'Mark as picked up' : 'I’ve collected it'}
          </Button>
        )}
        {role === 'receiver' && status === 'claimed' && (
          <Button variant="danger-ghost" size="sm" onClick={() => onAction('unclaim', listing)}>
            Release
          </Button>
        )}
        {role === 'donor' && ['expired', 'cancelled'].includes(status) && (
          <Button variant="ghost" size="sm" onClick={() => onAction('delete', listing)}>
            <Trash2 className="size-4" aria-hidden />
            Remove
          </Button>
        )}
      </div>
    </motion.li>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  useTitle(user.role === 'donor' ? 'My listings' : 'My pickups');
  const now = useNow();
  const tabs = TABS[user.role];
  const [tab, setTab] = useState(tabs[0].key);

  // Arrow keys move between tabs, as the tab pattern expects.
  const onTabKey = (e) => {
    const i = tabs.findIndex((t) => t.key === tab);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const target = tabs[(next + tabs.length) % tabs.length];
    setTab(target.key);
    document.getElementById(`tab-${target.key}`)?.focus();
  };
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload, setData } = useAsync(() => api.myListings(), []);

  const groups = useMemo(() => {
    const items = data?.items ?? [];
    return Object.fromEntries(tabs.map((t) => [t.key, items.filter((l) => t.statuses.includes(l.status))]));
  }, [data, tabs]);

  const confirm = async () => {
    const { type, listing } = pending;
    setBusy(true);
    try {
      await ACTIONS[type].run(listing._id);
      toast.success(ACTIONS[type].done);
      if (type === 'delete') setData((d) => ({ items: d.items.filter((l) => l._id !== listing._id) }));
      else await reload();
    } catch (err) {
      toast.error(err.message);
      reload();
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const current = groups[tab] ?? [];
  const isDonor = user.role === 'donor';

  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display text-4xl sm:text-5xl">
            {greeting()}, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-2 text-ink-soft">
            {user.organization ? `${user.organization}${user.city ? `, ${user.city}` : ''}` : 'Your MealBridge account'}
          </p>
        </div>
        {isDonor ? (
          <Button to="/listings/new" size="lg">
            <Plus className="size-5" aria-hidden />
            Post surplus food
          </Button>
        ) : (
          <Button to="/browse" size="lg">
            Find food to collect
          </Button>
        )}
      </div>

      <ImpactLedger role={user.role} />

      <div className="mt-12 flex border-b border-line sm:gap-1" role="tablist" aria-label={isDonor ? 'Your listings' : 'Your pickups'} onKeyDown={onTabKey}>
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls="tab-panel"
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
            className={clsx(
              'relative flex min-h-12 flex-1 items-center justify-center gap-1.5 px-1.5 py-2 text-center text-sm leading-tight font-semibold transition-colors sm:flex-none sm:gap-2 sm:px-4 sm:text-base sm:whitespace-nowrap',
              tab === t.key ? 'text-ink' : 'text-ink-soft hover:text-ink',
            )}
          >
            {t.label}
            <span className="num rounded-full bg-surface-2 px-2 text-xs font-bold text-ink-soft">{groups[t.key]?.length ?? 0}</span>
            {tab === t.key && (
              <motion.span layoutId="dash-tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-leaf" transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }} />
            )}
          </button>
        ))}
      </div>

      <div id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-6">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : current.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={
              isDonor
                ? tab === 'open'
                  ? 'Nothing on the board from you'
                  : tab === 'claimed'
                    ? 'No pickups in progress'
                    : 'No past listings yet'
                : tab === 'claimed'
                  ? 'No pickups to collect'
                  : 'No collections yet'
            }
            action={
              isDonor ? (
                tab === 'open' && <Button to="/listings/new">Post surplus food</Button>
              ) : (
                <Button to="/browse">Browse open listings</Button>
              )
            }
          >
            {isDonor
              ? tab === 'open'
                ? 'Post what’s left after service and it appears on the live board straight away.'
                : 'Listings show up here once an NGO claims them.'
              : 'Claim a listing from the board and it will show up here with the donor’s contact details.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            <AnimatePresence initial={false} mode="popLayout">
              {current.map((l) => (
                <Row key={l._id} listing={l} role={user.role} now={now} onAction={(type, listing) => setPending({ type, listing })} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => !busy && setPending(null)}
        onConfirm={confirm}
        loading={busy}
        title={pending && ACTIONS[pending.type].title}
        confirmLabel={pending && ACTIONS[pending.type].confirm}
        tone={pending && ACTIONS[pending.type].tone}
      >
        {pending && (
          <>
            <strong className="text-ink">{pending.listing.title}</strong>. {ACTIONS[pending.type].body}
          </>
        )}
      </ConfirmDialog>
    </Container>
  );
}
