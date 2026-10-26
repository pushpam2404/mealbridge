import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import clsx from 'clsx';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { api } from '../lib/api';
import { ALLERGENS, CATEGORIES, FOOD_TYPES, UNITS } from '../lib/constants';
import { toLocalInput } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { FoodMark } from '../components/FoodMark';
import { Button, Container, EmptyState, Field, Skeleton } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function roundUp(date, minutes = 15) {
  const ms = minutes * MIN;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

const PRESETS = [
  { label: 'Ready now, collect within 2 h', start: 0, window: 2, shelf: 4 },
  { label: 'After dinner service', at: 21, window: 2, shelf: 4 },
  { label: 'Tomorrow morning', at: 9, nextDay: true, window: 3, shelf: 24 },
];

function presetTimes(p) {
  let start;
  if (p.at !== undefined) {
    start = new Date();
    if (p.nextDay || start.getHours() >= p.at) start.setDate(start.getDate() + 1);
    start.setHours(p.at, 0, 0, 0);
  } else {
    start = roundUp(new Date(Date.now() + 10 * MIN));
  }
  return {
    pickupStart: toLocalInput(start),
    pickupEnd: toLocalInput(new Date(+start + p.window * HOUR)),
    expiresAt: toLocalInput(new Date(+start + p.shelf * HOUR)),
  };
}

const blank = (user) => ({
  title: '',
  description: '',
  category: '',
  foodType: '',
  quantity: '',
  unit: 'kg',
  estServings: '',
  allergens: [],
  pickupAddress: '',
  city: user?.city ?? '',
  ...presetTimes(PRESETS[0]),
});

const fromListing = (l) => ({
  title: l.title,
  description: l.description,
  category: l.category,
  foodType: l.foodType,
  quantity: String(l.quantity),
  unit: l.unit,
  estServings: String(l.estServings),
  allergens: l.allergens,
  pickupAddress: l.pickupAddress,
  city: l.city,
  pickupStart: toLocalInput(l.pickupStart),
  pickupEnd: toLocalInput(l.pickupEnd),
  expiresAt: toLocalInput(l.expiresAt),
});

// Mirrors the server's zod rules so most mistakes are caught before submitting.
function validate(v) {
  const e = {};
  if (v.title.trim().length < 3) e.title = 'Give it a short title (at least 3 characters)';
  if (!v.category) e.category = 'Pick a category';
  if (!v.foodType) e.foodType = 'Pick veg, non-veg or vegan';
  if (!(Number(v.quantity) > 0)) e.quantity = 'Quantity must be more than 0';
  const servings = Number(v.estServings);
  if (!Number.isInteger(servings) || servings < 1) e.estServings = 'Enter a whole number of people, at least 1';
  if (v.pickupAddress.trim().length < 5) e.pickupAddress = 'Enter the pickup address';
  if (v.city.trim().length < 2) e.city = 'Enter the city';
  const start = new Date(v.pickupStart);
  const end = new Date(v.pickupEnd);
  const exp = new Date(v.expiresAt);
  if (Number.isNaN(+start)) e.pickupStart = 'Enter when pickup can start';
  if (Number.isNaN(+end)) e.pickupEnd = 'Enter when pickup must end';
  else if (end <= start) e.pickupEnd = 'Pickup must end after it starts';
  if (Number.isNaN(+exp)) e.expiresAt = 'Enter when the food stops being safe to eat';
  else if (exp <= new Date()) e.expiresAt = 'Best-before time must be in the future';
  else if (exp < end) e.expiresAt = 'Food must stay fresh until pickup ends';
  return e;
}

const FIELD_ORDER = ['title', 'category', 'foodType', 'quantity', 'estServings', 'pickupAddress', 'city', 'pickupStart', 'pickupEnd', 'expiresAt'];

function Section({ title, hint, children }) {
  return (
    <fieldset className="grid gap-x-8 gap-y-5 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[14rem_1fr]">
      <div>
        <legend className="text-lg font-bold">{title}</legend>
        {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      </div>
      <div className="grid gap-5">{children}</div>
    </fieldset>
  );
}

function ChoiceGroup({ name, value, onChange, options, error, columns = 'grid-cols-2 sm:grid-cols-3', label }) {
  return (
    <div role="radiogroup" aria-label={label} aria-invalid={error ? true : undefined} data-field={name}>
      <div className={clsx('grid gap-2', columns)}>
        {options.map((o) => (
          <label
            key={o.value}
            className={clsx(
              'flex min-h-12 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold ring-inset transition-[box-shadow,background-color] has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-leaf',
              value === o.value ? 'bg-lime text-on-lime ring-2 ring-leaf' : 'bg-surface ring-1 ring-line hover:ring-ink-soft',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.icon}
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-tomato">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ListingEditor() {
  const { id } = useParams();
  const editing = Boolean(id);
  useTitle(editing ? 'Edit listing' : 'Post surplus food');
  const { user } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [values, setValues] = useState(() => blank(user));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadState, setLoadState] = useState(editing ? 'loading' : 'ready');

  useEffect(() => {
    if (!editing) return;
    api
      .listing(id)
      .then(({ listing }) => {
        if (listing.donor._id !== user._id) return setLoadState('forbidden');
        if (listing.status !== 'available') return setLoadState(`locked:${listing.status}`);
        setValues(fromListing(listing));
        setLoadState('ready');
      })
      .catch(() => setLoadState('missing'));
  }, [editing, id, user._id]);

  const set = (key) => (value) => {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (touched[key] || errors[key]) setErrors(validate(next));
      return next;
    });
  };
  const bind = (key) => ({
    value: values[key],
    onChange: (e) => set(key)(e.target.value),
    onBlur: () => {
      setTouched((t) => ({ ...t, [key]: true }));
      setErrors(validate(values));
    },
  });
  const shown = (key) => (touched[key] || errors._submitted ? errors[key] : undefined);

  const focusFirstError = (errs) => {
    const key = FIELD_ORDER.find((k) => errs[k]);
    if (!key || !formRef.current) return;
    const el = formRef.current.querySelector(`[name="${key}"]`) ?? formRef.current.querySelector(`[data-field="${key}"] input`);
    el?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(values);
    if (Object.keys(errs).length) {
      setErrors({ ...errs, _submitted: true });
      focusFirstError(errs);
      return;
    }
    setSaving(true);
    const body = {
      ...values,
      quantity: Number(values.quantity),
      estServings: Number(values.estServings),
      pickupStart: new Date(values.pickupStart).toISOString(),
      pickupEnd: new Date(values.pickupEnd).toISOString(),
      expiresAt: new Date(values.expiresAt).toISOString(),
    };
    try {
      const { listing } = editing ? await api.updateListing(id, body) : await api.createListing(body);
      toast.success(editing ? 'Changes saved.' : 'Listing posted. Nearby NGOs can see it now.');
      navigate(`/listings/${listing._id}`);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) {
        setErrors({ ...err.fields, _submitted: true });
        focusFirstError(err.fields);
      }
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <Container className="max-w-4xl space-y-4 py-12">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </Container>
    );
  }
  if (loadState !== 'ready') {
    const status = loadState.split(':')[1];
    return (
      <Container className="max-w-3xl py-12">
        <EmptyState
          title={status ? `This listing is ${status === 'completed' ? 'already picked up' : status}` : 'You can’t edit this listing'}
          action={<Button to="/dashboard">Back to my listings</Button>}
        >
          {status ? 'Only listings that are still waiting for a claim can be edited.' : 'It doesn’t exist or belongs to another kitchen.'}
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container className="max-w-4xl py-8 sm:py-12">
      <Link to={editing ? `/listings/${id}` : '/dashboard'} className="inline-flex items-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        {editing ? 'Back to listing' : 'My listings'}
      </Link>
      <h1 className="display mt-3 text-4xl sm:text-5xl">{editing ? 'Edit listing' : 'Post surplus food'}</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        {editing
          ? 'Changes show up on the board straight away.'
          : 'It goes on the live board as soon as you post it. NGOs nearby see the soonest-expiring food first.'}
      </p>

      <form ref={formRef} onSubmit={submit} noValidate className="ticket mt-8 p-6 sm:p-8">
        <Section title="What’s the food?" hint="A clear title helps NGOs decide quickly.">
          <Field label="Title" required error={shown('title')}>
            {(a) => <input {...a} name="title" className="field" maxLength={100} placeholder="e.g. Veg biryani, 3 hotel pans" {...bind('title')} />}
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-semibold">
              Category<span className="text-tomato" aria-hidden> *</span>
            </p>
            <ChoiceGroup
              name="category"
              label="Category"
              value={values.category}
              onChange={set('category')}
              error={shown('category')}
              options={Object.entries(CATEGORIES).map(([value, c]) => ({ value, label: c.label, icon: <c.icon className="size-4.5 shrink-0" aria-hidden /> }))}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">
              Food type<span className="text-tomato" aria-hidden> *</span>
            </p>
            <ChoiceGroup
              name="foodType"
              label="Food type"
              columns="grid-cols-3"
              value={values.foodType}
              onChange={set('foodType')}
              error={shown('foodType')}
              options={Object.entries(FOOD_TYPES).map(([value]) => ({ value, label: <FoodMark type={value} /> }))}
            />
          </div>
          <Field label="Description" hint="How it’s packed, how it was stored, anything the collector should bring.">
            {(a) => <textarea {...a} name="description" rows={3} maxLength={1000} className="field resize-y" {...bind('description')} />}
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-semibold">Contains allergens</p>
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map((a) => {
                const on = values.allergens.includes(a);
                return (
                  <label
                    key={a}
                    className={clsx(
                      'flex h-10 items-center rounded-full px-4 text-sm font-semibold capitalize ring-inset transition-colors has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-leaf',
                      on ? 'bg-amber-soft text-amber ring-2 ring-amber' : 'ring-1 ring-line text-ink-soft hover:text-ink',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => set('allergens')(on ? values.allergens.filter((x) => x !== a) : [...values.allergens, a])}
                    />
                    {a}
                  </label>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title="How much is there?" hint="A rough count is fine. It drives the meals-saved total.">
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <Field label="Quantity" required error={shown('quantity')}>
              {(a) => <input {...a} name="quantity" type="number" inputMode="decimal" min="0" step="any" className="field num" {...bind('quantity')} />}
            </Field>
            <Field label="Unit">
              {(a) => (
                <select {...a} name="unit" className="field" {...bind('unit')}>
                  {Object.entries(UNITS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Field label="Feeds about how many people?" required error={shown('estServings')}>
            {(a) => <input {...a} name="estServings" type="number" inputMode="numeric" min="1" step="1" className="field num" {...bind('estServings')} />}
          </Field>
        </Section>

        <Section title="When and where?" hint="The listing comes off the board automatically after its best-before time.">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink-soft ring-1 ring-line ring-inset hover:text-ink hover:ring-ink-soft"
                onClick={() => {
                  setValues((v) => ({ ...v, ...presetTimes(p) }));
                  setErrors((e) => ({ ...e, pickupStart: undefined, pickupEnd: undefined, expiresAt: undefined }));
                }}
              >
                <Clock3 className="size-4" aria-hidden />
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Pickup from" required error={shown('pickupStart')}>
              {(a) => <input {...a} name="pickupStart" type="datetime-local" className="field num" {...bind('pickupStart')} />}
            </Field>
            <Field label="Pickup until" required error={shown('pickupEnd')}>
              {(a) => <input {...a} name="pickupEnd" type="datetime-local" className="field num" {...bind('pickupEnd')} />}
            </Field>
          </div>
          <Field label="Safe to eat until" required hint="Be conservative. Receivers plan their distribution around this." error={shown('expiresAt')}>
            {(a) => <input {...a} name="expiresAt" type="datetime-local" className="field num" {...bind('expiresAt')} />}
          </Field>
          <Field label="Pickup address" required error={shown('pickupAddress')}>
            {(a) => <input {...a} name="pickupAddress" autoComplete="street-address" className="field" placeholder="Shop 4, Lane 6, Koregaon Park" {...bind('pickupAddress')} />}
          </Field>
          <Field label="City" required error={shown('city')}>
            {(a) => <input {...a} name="city" autoComplete="address-level2" className="field sm:max-w-xs" {...bind('city')} />}
          </Field>
        </Section>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
          <Button variant="secondary" to={editing ? `/listings/${id}` : '/dashboard'}>
            Discard
          </Button>
          <Button type="submit" size="lg" loading={saving}>
            {editing ? 'Save changes' : 'Post listing'}
          </Button>
        </div>
      </form>
    </Container>
  );
}
