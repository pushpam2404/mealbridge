import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Building2, Check, HandHeart } from 'lucide-react';
import { api } from '../lib/api';
import { fmtNumber } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useNow';
import { useAuth } from '../context/AuthContext';
import { Ticket, TicketSkeleton } from '../components/Ticket';
import { Button, Container } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

const hang = [
  { rotate: -1.6, x: 0 },
  { rotate: 1.2, x: 28 },
];

function PickupBoard() {
  const now = useNow();
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches;
  const { data, loading, error } = useAsync(() => api.listings({ limit: 2, sort: 'expiring' }), []);
  const items = data?.items ?? [];

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-rail p-4 pb-8 sm:p-6 sm:pb-10"
      style={{ '--ticket-bg': 'var(--rail)' }}
      aria-label="Food waiting for pickup right now"
      role="region"
    >
      <div className="mb-6 flex items-center justify-between gap-4 text-sm text-white/75">
        <span className="flex items-center gap-2 font-semibold text-white">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-lime" />
          </span>
          Live pickup board
        </span>
        <Link to="/browse" className="font-medium underline-offset-4 hover:text-white hover:underline">
          {data ? `All ${data.total} open listings` : 'All open listings'}
        </Link>
      </div>

      <div className="mb-5 h-2 rounded-full bg-gradient-to-b from-white/35 to-white/10" aria-hidden />

      <div className="flex flex-col gap-5 sm:pr-8">
        {loading &&
          hang.map((h, i) => (
            <div key={i} style={{ transform: `translateX(${h.x}px) rotate(${h.rotate}deg)` }}>
              <TicketSkeleton />
            </div>
          ))}

        {!loading && (error || items.length === 0) && (
          <div className="rounded-xl border-2 border-dashed border-white/20 px-6 py-12 text-center text-white/80">
            <p className="font-semibold text-white">The board is clear right now.</p>
            <p className="mt-1 text-sm">New surplus usually appears after lunch and dinner service.</p>
          </div>
        )}

        {!loading &&
          items.map((listing, i) => (
            <motion.div
              key={listing._id}
              className="relative"
              initial={{ y: -48, opacity: 0, rotate: 0 }}
              animate={{ y: 0, opacity: 1, rotate: hang[i].rotate, x: wide ? hang[i].x : hang[i].x / 3 }}
              transition={{ type: 'spring', bounce: 0.35, visualDuration: 0.55, delay: 0.15 + i * 0.14 }}
              style={{ transformOrigin: '50% 0%' }}
            >
              <span
                className="absolute -top-3 left-1/2 z-10 h-5 w-10 -translate-x-1/2 rounded-sm bg-gradient-to-b from-zinc-300 to-zinc-500 shadow-md"
                aria-hidden
              />
              <Ticket listing={listing} now={now} headingLevel="h2" />
            </motion.div>
          ))}
      </div>
    </div>
  );
}

const steps = [
  {
    title: 'A kitchen posts its surplus',
    body: 'What it is, how many people it feeds, when it can be collected and when it stops being safe to eat.',
  },
  {
    title: 'A nearby NGO claims it',
    body: 'The first receiver to claim gets the pickup. Contact details are shared only between the two of them.',
  },
  {
    title: 'They collect it and confirm',
    body: 'Either side marks the pickup done, and the meals count toward the city’s impact total.',
  },
];

function HowItWorks() {
  return (
    <section className="py-20 sm:py-28" aria-labelledby="how-heading">
      <Container>
        <h2 id="how-heading" className="display max-w-xl text-4xl sm:text-5xl">
          From the kitchen pass to a plate, in three steps.
        </h2>
        <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {steps.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="mb-5 flex items-center gap-4">
                <span className="display num grid size-12 shrink-0 place-items-center rounded-full bg-lime text-2xl text-on-lime">
                  {i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span className="hidden h-0 flex-1 border-t-2 border-dashed border-line sm:block" aria-hidden />
                )}
              </div>
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="mt-2 max-w-xs text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function ImpactBand({ stats }) {
  const weekly = stats?.weekly ?? [];
  const max = Math.max(1, ...weekly.map((w) => w.meals));

  return (
    <section className="bg-surface py-20 sm:py-24" aria-labelledby="impact-heading">
      <Container className="grid items-end gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 id="impact-heading" className="display text-4xl sm:text-5xl">
            {stats ? `${fmtNumber(stats.totals.meals)} meals that didn’t end up in a bin.` : 'Every pickup is counted.'}
          </h2>
          <p className="mt-5 max-w-md text-lg text-ink-soft">
            {stats
              ? `That is ${fmtNumber(stats.totals.kg)} kg of food across ${fmtNumber(stats.totals.pickups)} pickups, and roughly ${fmtNumber(Math.round(stats.totals.co2))} kg of CO₂e kept out of landfill.`
              : 'Meals, kilograms and emissions avoided are tallied from confirmed pickups only.'}
          </p>
          <Button to="/impact" variant="secondary" className="mt-8">
            See the full impact report
          </Button>
        </div>

        <figure>
          <div className="flex h-56 items-end gap-1.5 sm:gap-2.5" role="img" aria-label="Meals rescued per week over the last ten weeks">
            {weekly.map((w, i) => (
              <motion.div
                key={w.week}
                className="flex-1 origin-bottom rounded-t-[4px] bg-chart"
                style={{ height: `${(w.meals / max) * 100}%` }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.5, delay: i * 0.04 }}
                title={`${fmtNumber(w.meals)} meals`}
              />
            ))}
          </div>
          <figcaption className="mt-3 flex justify-between text-sm text-ink-soft">
            <span>Ten weeks ago</span>
            <span>Meals rescued each week</span>
            <span>This week</span>
          </figcaption>
        </figure>
      </Container>
    </section>
  );
}

const roles = [
  {
    icon: Building2,
    title: 'For restaurants, hostels and caterers',
    points: ['Post surplus in under a minute', 'Set a pickup window that suits your shift', 'See how many people your kitchen has fed'],
    cta: 'Start donating',
    to: '/register?role=donor',
  },
  {
    icon: HandHeart,
    title: 'For NGOs, shelters and volunteers',
    points: ['See what is available near you, soonest-expiring first', 'Claim food with one tap', 'Get the donor’s contact once you claim'],
    cta: 'Start receiving',
    to: '/register?role=receiver',
  },
];

function Roles() {
  return (
    <section className="pt-20 sm:pt-28" aria-labelledby="roles-heading">
      <Container>
        <h2 id="roles-heading" className="sr-only">
          Who MealBridge is for
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {roles.map((r) => (
            <div key={r.title} className="flex flex-col rounded-2xl border border-line p-7 sm:p-9">
              <r.icon className="size-8 text-leaf" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-5 text-2xl font-bold">{r.title}</h3>
              <ul className="mt-5 flex-1 space-y-3">
                {r.points.map((p) => (
                  <li key={p} className="flex gap-3 text-ink-soft">
                    <Check className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              <Button to={r.to} variant="secondary" className="mt-8 self-start">
                {r.cta}
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default function Home() {
  useTitle();
  const { user } = useAuth();
  const { data: stats } = useAsync(() => api.stats(), []);

  return (
    <>
      <section className="pt-10 pb-16 sm:pt-16 lg:pt-20">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div>
            <h1 className="display text-[clamp(2.9rem,7.5vw,5.4rem)] leading-[0.95]">
              Tonight’s leftovers can be someone’s dinner.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-ink-soft sm:text-xl">
              Restaurants, hostels and caterers post surplus food on MealBridge. NGOs and volunteers nearby claim it and
              pick it up before it spoils.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/browse" size="lg">
                See food available now
              </Button>
              {user?.role === 'donor' ? (
                <Button to="/listings/new" size="lg" variant="secondary">
                  Post surplus food
                </Button>
              ) : (
                <Button to="/register?role=donor" size="lg" variant="secondary">
                  Donate surplus food
                </Button>
              )}
            </div>
            {stats && (
              <p className="mt-8 max-w-md text-ink-soft">
                <strong className="num text-ink">{fmtNumber(stats.availableNow)}</strong> listings are waiting for
                pickup right now, from <strong className="num text-ink">{stats.community.donors}</strong> kitchens
                feeding <strong className="num text-ink">{stats.community.receivers}</strong> partner organisations.
              </p>
            )}
          </div>
          <PickupBoard />
        </Container>
      </section>
      <HowItWorks />
      <ImpactBand stats={stats} />
      <Roles />
    </>
  );
}
