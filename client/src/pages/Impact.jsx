import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import { fmtNumber } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { Button, Container, ErrorState, Skeleton } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

const TOKENS = ['--chart', '--ink', '--ink-soft', '--line', '--surface', '--surface-2'];

// SVG attributes can't read CSS variables, so resolve them and re-read when the theme flips.
function useTokens() {
  const read = () => {
    const css = getComputedStyle(document.documentElement);
    return Object.fromEntries(TOKENS.map((t) => [t.slice(2), css.getPropertyValue(t).trim()]));
  };
  const [tokens, setTokens] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setTokens(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return tokens;
}

const weekLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg bg-surface px-3 py-2 text-sm shadow-ticket ring-1 ring-line">
      <p className="font-semibold text-ink">{labelFormatter ? labelFormatter(label) : label}</p>
      <p className="num text-ink-soft">
        {fmtNumber(row.meals)} meals, {fmtNumber(row.kg)} kg
      </p>
    </div>
  );
}

function ChartCard({ title, caption, children, table }) {
  return (
    <figure className="ticket p-5 sm:p-7">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{caption}</p>
      <div className="mt-6">{children}</div>
      <details className="mt-4 text-sm">
        <summary className="inline-flex min-h-10 items-center font-semibold text-leaf">Show as a table</summary>
        <div className="mt-2 overflow-x-auto">{table}</div>
      </details>
    </figure>
  );
}

function DataTable({ head, rows }) {
  return (
    <table className="num w-full text-left">
      <thead className="text-ink-soft">
        <tr>
          {head.map((h, i) => (
            <th key={h} className={`border-b border-line py-2 font-medium ${i ? 'text-right' : ''}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]}>
            {r.map((c, i) => (
              <td key={i} className={`border-b border-line py-2 ${i ? 'text-right' : ''}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Impact() {
  useTitle('Impact');
  const t = useTokens();
  const { data, loading, error, reload } = useAsync(() => api.stats(), []);

  if (error) {
    return (
      <Container className="py-12">
        <ErrorState error={error} onRetry={reload} />
      </Container>
    );
  }

  const axis = { stroke: t.line, tick: { fill: t['ink-soft'], fontSize: 13 }, tickLine: false };
  const weekly = (data?.weekly ?? []).map((w) => ({ ...w, label: weekLabel.format(new Date(w.week)) }));
  const categories = (data?.byCategory ?? []).map((c) => ({ ...c, label: CATEGORIES[c.category]?.label ?? c.category }));

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="display max-w-3xl text-4xl sm:text-5xl">
        {data ? `${fmtNumber(data.totals.meals)} meals rescued and counting` : 'Impact report'}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Only pickups that both sides have confirmed are counted. Food that expired or was cancelled is left out.
      </p>

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {(data
          ? [
              ['Meals rescued', fmtNumber(data.totals.meals)],
              ['Food kept out of the bin', `${fmtNumber(data.totals.kg)} kg`],
              ['CO₂e avoided', `${fmtNumber(Math.round(data.totals.co2))} kg`],
              ['Completed pickups', fmtNumber(data.totals.pickups)],
            ]
          : Array.from({ length: 4 }, (_, i) => [i])
        ).map(([label, value]) => (
          <div key={label} className="bg-surface p-5 sm:p-6">
            {value === undefined ? (
              <>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-9 w-20" />
              </>
            ) : (
              <>
                <dt className="text-sm text-ink-soft">{label}</dt>
                <dd className="display num mt-1 text-3xl sm:text-4xl">{value}</dd>
              </>
            )}
          </div>
        ))}
      </dl>

      {data && (
        <p className="mt-4 text-ink-soft">
          Right now {fmtNumber(data.availableNow)} listings are open and {fmtNumber(data.inTransit)} are on their way to a
          kitchen table. {data.community.donors} donors and {data.community.receivers} receiving organisations use
          MealBridge.
        </p>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {loading && !data ? (
          <>
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </>
        ) : (
          <>
            <ChartCard
              title="Meals rescued each week"
              caption="Last ten weeks, by the week the pickup was confirmed."
              table={<DataTable head={['Week of', 'Meals', 'kg']} rows={weekly.map((w) => [w.label, fmtNumber(w.meals), fmtNumber(w.kg)])} />}
            >
              <div className="h-72" role="img" aria-label={`Bar chart of meals rescued per week. Highest week: ${fmtNumber(Math.max(0, ...weekly.map((w) => w.meals)))} meals.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap={2}>
                    <CartesianGrid vertical={false} stroke={t.line} strokeDasharray="0" strokeOpacity={0.7} />
                    <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis {...axis} axisLine={false} width={48} allowDecimals={false} />
                    <Tooltip cursor={{ fill: t['surface-2'] }} content={<ChartTooltip labelFormatter={(l) => `Week of ${l}`} />} />
                    <Bar dataKey="meals" name="Meals" fill={t.chart} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="What gets rescued"
              caption="All confirmed pickups so far, by food category."
              table={<DataTable head={['Category', 'Meals', 'kg']} rows={categories.map((c) => [c.label, fmtNumber(c.meals), fmtNumber(c.kg)])} />}
            >
              <div className="h-72" role="img" aria-label={`Horizontal bar chart of meals by category. ${categories.map((c) => `${c.label}: ${c.meals}`).join(', ')}.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={8}>
                    <XAxis type="number" dataKey="meals" hide domain={[0, 'dataMax']} />
                    <YAxis type="category" dataKey="label" {...axis} axisLine={false} width={116} />
                    <Tooltip cursor={{ fill: t['surface-2'] }} content={<ChartTooltip />} />
                    <Bar dataKey="meals" name="Meals" fill={t.chart} radius={[0, 4, 4, 0]} maxBarSize={30}>
                      <LabelList dataKey="meals" position="right" formatter={fmtNumber} fill={t.ink} fontSize={13} fontWeight={600} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </>
        )}
      </div>

      <section className="mt-12 max-w-2xl" aria-labelledby="method">
        <h2 id="method" className="text-xl font-bold">
          How these numbers are worked out
        </h2>
        <p className="mt-2 text-ink-soft">
          Meals are the donor’s own estimate of how many people a listing feeds. Weight is the listed weight when given
          in kilograms, otherwise 0.4 kg per serving. Emissions avoided assume 2.5 kg of CO₂-equivalent for every
          kilogram of food that would otherwise have gone to landfill.
        </p>
        <Button to="/browse" className="mt-6">
          Find food to collect
        </Button>
      </section>
    </Container>
  );
}
