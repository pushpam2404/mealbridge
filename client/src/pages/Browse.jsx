import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Search, SearchX } from 'lucide-react';
import { api } from '../lib/api';
import { CATEGORIES, FOOD_TYPES } from '../lib/constants';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useNow';
import { Ticket, TicketSkeleton } from '../components/Ticket';
import { Button, Container, EmptyState, ErrorState } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

const SORTS = {
  expiring: 'Expiring soonest',
  newest: 'Newest first',
  largest: 'Feeds the most',
};

function Chip({ active, onClick, children, group }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'relative h-10 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors',
        active ? 'text-on-leaf' : 'text-ink-soft ring-1 ring-line ring-inset hover:text-ink hover:ring-ink-soft',
      )}
    >
      {active && (
        <motion.span
          layoutId={`chip-${group}`}
          className="absolute inset-0 rounded-full bg-leaf"
          transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}

export default function Browse() {
  useTitle('Find food');
  const [params, setParams] = useSearchParams();
  const now = useNow();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const foodType = params.get('foodType') ?? '';
  const city = params.get('city') ?? '';
  const sort = params.get('sort') ?? 'expiring';
  const page = Number(params.get('page')) || 1;

  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (search === q) return undefined;
    const id = setTimeout(() => update({ q: search.trim() }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data: cityData } = useAsync(() => api.cities(), []);
  const { data, loading, error, reload } = useAsync(
    () => api.listings({ q, category, foodType, city, sort, page, limit: 12 }),
    [q, category, foodType, city, sort, page],
  );

  const filtered = Boolean(q || category || foodType || city);
  const items = data?.items ?? [];

  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display text-4xl sm:text-5xl">Food waiting for pickup</h1>
          <p className="mt-2 text-ink-soft" aria-live="polite">
            {data
              ? data.total === 0
                ? 'No open listings match these filters.'
                : `${data.total} open listing${data.total === 1 ? '' : 's'}${city ? ` in ${city}` : ''}, sorted by ${SORTS[sort].toLowerCase()}.`
              : 'Loading open listings…'}
          </p>
        </div>
      </div>

      <div className="z-30 -mx-4 mt-8 md:sticky md:top-16 border-b border-line bg-paper/90 px-4 py-4 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:px-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="relative col-span-2 block md:col-span-1">
            <span className="sr-only">Search listings</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-soft" aria-hidden />
            <input
              type="search"
              className="field pl-10"
              placeholder="Search biryani, bread, Koregaon Park…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="sr-only">City</span>
            <select className="field w-full md:w-44" value={city} onChange={(e) => update({ city: e.target.value })}>
              <option value="">All cities</option>
              {cityData?.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Sort by</span>
            <select className="field w-full md:w-48" value={sort} onChange={(e) => update({ sort: e.target.value === 'expiring' ? '' : e.target.value })}>
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <LayoutGroup id="category">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
              <Chip group="category" active={!category} onClick={() => update({ category: '' })}>
                Everything
              </Chip>
              {Object.entries(CATEGORIES).map(([key, c]) => (
                <Chip key={key} group="category" active={category === key} onClick={() => update({ category: key })}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </LayoutGroup>
          <span className="mx-1 hidden h-6 w-px bg-line lg:block" aria-hidden />
          <LayoutGroup id="foodType">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Food type">
              {Object.entries(FOOD_TYPES).map(([key, label]) => (
                <Chip
                  key={key}
                  group="foodType"
                  active={foodType === key}
                  onClick={() => update({ foodType: foodType === key ? '' : key })}
                >
                  {label} only
                </Chip>
              ))}
            </div>
          </LayoutGroup>
        </div>
      </div>

      <div className="mt-8">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <TicketSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={filtered ? 'Nothing matches these filters' : 'No food is waiting right now'}
            action={
              filtered ? (
                <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                  Clear all filters
                </Button>
              ) : (
                <Button to="/register?role=donor">Post surplus food</Button>
              )
            }
          >
            {filtered
              ? 'Try another city or category, or search for something broader.'
              : 'Kitchens usually post after lunch and dinner service. Check back then.'}
          </EmptyState>
        ) : (
          <motion.div
            className={clsx('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', loading && 'opacity-60 transition-opacity')}
            aria-busy={loading}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {items.map((listing) => (
                <motion.div
                  key={listing._id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', bounce: 0.1, visualDuration: 0.3 }}
                  className="relative"
                >
                  <Ticket listing={listing} now={now} headingLevel="h2" className="h-full" />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {data && data.pages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </Button>
            <span className="num px-2 text-sm text-ink-soft">
              Page {page} of {data.pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => update({ page: String(page + 1) })}
            >
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </nav>
        )}
      </div>
    </Container>
  );
}
