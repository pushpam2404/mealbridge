import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { LogOut, Menu, Moon, Plus, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { Logo } from './Logo';
import { Button, Container } from './ui';

const REPO_URL = 'https://github.com/pushpam2404/mealbridge';

function NavItem({ to, children, onClick, indicator = 'nav-underline' }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'relative rounded-lg px-3 py-2 text-[0.95rem] font-semibold transition-colors',
          isActive ? 'text-ink' : 'text-ink-soft hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {isActive && (
            <motion.span
              layoutId={indicator}
              className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-leaf"
              transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-surface-2 hover:text-ink"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState(null);
  const open = openOn === location.pathname;

  const signOut = () => {
    setOpenOn(null);
    logout();
    navigate('/');
  };

  const links = (indicator) => (
    <>
      <NavItem indicator={indicator} to="/browse">Find food</NavItem>
      <NavItem indicator={indicator} to="/impact">Impact</NavItem>
      {user && (
        <NavItem indicator={indicator} to="/dashboard">
          {user.role === 'donor' ? 'My listings' : 'My pickups'}
        </NavItem>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <Container className="flex h-16 items-center gap-3">
        <Link to="/" className="mr-2 flex items-center gap-2.5 rounded-lg" aria-label="MealBridge home">
          <Logo className="size-8" />
          <span className="display text-[1.35rem] tracking-tight">MealBridge</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links('nav-underline')}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              {user.role === 'donor' && (
                <Button to="/listings/new" size="sm">
                  <Plus className="size-4" aria-hidden />
                  Post food
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="size-4" aria-hidden />
                Sign out
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button to="/login" variant="ghost" size="sm">
                Sign in
              </Button>
              <Button to="/register" size="sm">
                Join MealBridge
              </Button>
            </div>
          )}
          <button
            type="button"
            className="grid size-10 place-items-center rounded-lg text-ink hover:bg-surface-2 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpenOn(open ? null : location.pathname)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Main"
            className="overflow-hidden border-t border-line md:hidden"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ type: 'spring', bounce: 0, visualDuration: 0.25 }}
          >
            <Container className="flex flex-col gap-1 py-3">
              {links('nav-underline-mobile')}
              <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
                {user ? (
                  <>
                    {user.role === 'donor' && <Button to="/listings/new">Post food</Button>}
                    <Button variant="secondary" onClick={signOut}>
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button to="/register">Join MealBridge</Button>
                    <Button to="/login" variant="secondary">
                      Sign in
                    </Button>
                  </>
                )}
              </div>
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t border-line">
      <Container className="flex flex-col gap-6 py-10 text-sm text-ink-soft sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-sm">
          <Link to="/" className="mb-3 flex items-center gap-2 text-ink">
            <Logo className="size-6" />
            <span className="display text-lg">MealBridge</span>
          </Link>
          <p>
            Built by Pushpam Raj Satyarthi for the Web Application Framework course. Impact figures use 0.4 kg per
            serving and 2.5 kg CO₂e avoided per kg of food rescued.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
          <Link className="hover:text-ink" to="/browse">
            Find food
          </Link>
          <Link className="hover:text-ink" to="/impact">
            Impact
          </Link>
          <Link className="hover:text-ink" to="/register?role=donor">
            Donate food
          </Link>
          <a className="hover:text-ink" href={REPO_URL} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </nav>
      </Container>
    </footer>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const main = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-leaf px-4 py-2 font-semibold text-on-leaf focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" ref={main} tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
