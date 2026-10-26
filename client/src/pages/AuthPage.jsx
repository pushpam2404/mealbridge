import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Building2, Eye, EyeOff, HandHeart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO } from '../lib/constants';
import { Button, Container, Field } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

const ROLE_OPTIONS = [
  { value: 'donor', icon: Building2, title: 'I have surplus food', body: 'Restaurant, hostel mess, caterer, bakery or hotel' },
  { value: 'receiver', icon: HandHeart, title: 'I collect food for people', body: 'NGO, shelter, community kitchen or volunteer group' },
];

function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className="field pr-12" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-md text-ink-soft hover:text-ink"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  useTitle(isLogin ? 'Sign in' : 'Join');
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = location.state?.from ?? '/dashboard';

  const [values, setValues] = useState({
    role: ['donor', 'receiver'].includes(params.get('role')) ? params.get('role') : '',
    name: '',
    organization: '',
    email: '',
    password: '',
    city: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null);

  const bind = (key) => ({
    name: key,
    value: values[key],
    onChange: (e) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
    },
  });

  const check = () => {
    const e = {};
    if (!isLogin && !values.role) e.role = 'Choose whether you donate or collect food';
    if (!isLogin && values.name.trim().length < 2) e.name = 'Enter your name (at least 2 characters)';
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) e.email = 'Enter a valid email address';
    if (!isLogin) {
      if (values.password.length < 8) e.password = 'Use at least 8 characters';
    } else if (!values.password) e.password = 'Enter your password';
    return e;
  };

  const finish = (user, verb) => {
    toast.success(`${verb}, ${user.name.split(' ')[0]}.`);
    navigate(from, { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = check();
    setErrors(errs);
    if (Object.keys(errs).length) {
      e.currentTarget.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setBusy('form');
    try {
      const user = isLogin
        ? await login({ email: values.email, password: values.password })
        : await register(values);
      finish(user, isLogin ? 'Welcome back' : 'Welcome to MealBridge');
    } catch (err) {
      setErrors(err.fields ?? {});
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const demo = async (role) => {
    setBusy(role);
    try {
      finish(await login(DEMO[role]), 'Signed in to the demo');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Container className="grid max-w-5xl gap-10 py-10 sm:py-16 lg:grid-cols-[1fr_22rem] lg:gap-14">
      <div>
        <h1 className="display text-4xl sm:text-5xl">{isLogin ? 'Sign in to MealBridge' : 'Join MealBridge'}</h1>
        <p className="mt-2 text-ink-soft">
          {isLogin ? (
            <>
              New here?{' '}
              <Link to="/register" className="font-semibold text-leaf hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link to="/login" state={location.state} className="font-semibold text-leaf hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>

        <form onSubmit={submit} noValidate className="mt-8 grid gap-5">
          {!isLogin && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                How will you use MealBridge?<span className="text-tomato" aria-hidden> *</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLE_OPTIONS.map((r) => (
                  <label
                    key={r.value}
                    className={clsx(
                      'flex gap-3 rounded-xl p-4 ring-inset transition-[box-shadow,background-color] has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-leaf',
                      values.role === r.value ? 'bg-lime text-on-lime ring-2 ring-leaf' : 'bg-surface ring-1 ring-line hover:ring-ink-soft',
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={values.role === r.value}
                      onChange={() => {
                        setValues((v) => ({ ...v, role: r.value }));
                        setErrors((er) => ({ ...er, role: undefined }));
                      }}
                      className="sr-only"
                    />
                    <r.icon className="mt-0.5 size-6 shrink-0" aria-hidden />
                    <span>
                      <span className="block font-bold">{r.title}</span>
                      <span className={clsx('block text-sm', values.role === r.value ? 'text-on-lime/80' : 'text-ink-soft')}>{r.body}</span>
                    </span>
                  </label>
                ))}
              </div>
              {errors.role && (
                <p role="alert" className="mt-1.5 text-sm font-medium text-tomato">
                  {errors.role}
                </p>
              )}
            </fieldset>
          )}

          {!isLogin && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Your name" required error={errors.name}>
                {(a) => <input {...a} autoComplete="name" className="field" {...bind('name')} />}
              </Field>
              <Field label={values.role === 'receiver' ? 'Organisation' : 'Kitchen or business'} error={errors.organization}>
                {(a) => <input {...a} autoComplete="organization" className="field" {...bind('organization')} />}
              </Field>
            </div>
          )}

          <Field label="Email" required error={errors.email}>
            {(a) => <input {...a} type="email" autoComplete="email" inputMode="email" className="field" {...bind('email')} />}
          </Field>
          <Field label="Password" required hint={isLogin ? undefined : 'At least 8 characters.'} error={errors.password}>
            {(a) => <PasswordInput {...a} autoComplete={isLogin ? 'current-password' : 'new-password'} {...bind('password')} />}
          </Field>

          {!isLogin && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="City" error={errors.city}>
                {(a) => <input {...a} autoComplete="address-level2" className="field" {...bind('city')} />}
              </Field>
              <Field label="Phone" hint="Shared only with the other side of a pickup." error={errors.phone}>
                {(a) => <input {...a} type="tel" autoComplete="tel" className="field" {...bind('phone')} />}
              </Field>
            </div>
          )}

          <Button type="submit" size="lg" loading={busy === 'form'} disabled={Boolean(busy)} className="mt-2 w-full sm:w-auto sm:justify-self-start">
            {isLogin ? 'Sign in' : 'Create account'}
          </Button>
        </form>
      </div>

      <aside className="ticket self-start p-6" aria-labelledby="demo-heading">
        <h2 id="demo-heading" className="text-lg font-bold">
          Just looking around?
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Use a demo account with sample data. Both use the password demo1234.</p>
        <div className="mt-5 grid gap-3">
          <Button variant="secondary" onClick={() => demo('donor')} loading={busy === 'donor'} disabled={Boolean(busy)} className="justify-start">
            <Building2 className="size-5" aria-hidden />
            Try as a kitchen
          </Button>
          <Button variant="secondary" onClick={() => demo('receiver')} loading={busy === 'receiver'} disabled={Boolean(busy)} className="justify-start">
            <HandHeart className="size-5" aria-hidden />
            Try as an NGO
          </Button>
        </div>
        <div className="-mx-6 my-6" aria-hidden>
          <div className="ticket-tear" />
        </div>
        <p className="text-sm text-ink-soft">
          Kitchen demo: Spice Route Kitchen, Pune. NGO demo: Roti Bank Foundation, Pune.
        </p>
      </aside>
    </Container>
  );
}
