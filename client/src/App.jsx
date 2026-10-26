import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Container, Skeleton } from './components/ui';
import Home from './pages/Home';

const Browse = lazy(() => import('./pages/Browse'));
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const ListingEditor = lazy(() => import('./pages/ListingEditor'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Impact = lazy(() => import('./pages/Impact'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return (
    <Container className="space-y-4 py-12" aria-busy="true">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-64 w-full" />
    </Container>
  );
}

function RequireAuth({ role }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageFallback />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

const page = (el) => <Suspense fallback={<PageFallback />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'browse', element: page(<Browse />) },
      { path: 'impact', element: page(<Impact />) },
      { path: 'login', element: page(<AuthPage mode="login" />) },
      { path: 'register', element: page(<AuthPage mode="register" />) },
      { path: 'listings/:id', element: page(<ListingDetail />) },
      {
        element: <RequireAuth />,
        children: [{ path: 'dashboard', element: page(<Dashboard />) }],
      },
      {
        element: <RequireAuth role="donor" />,
        children: [
          { path: 'listings/new', element: page(<ListingEditor />) },
          { path: 'listings/:id/edit', element: page(<ListingEditor />) },
        ],
      },
      { path: '*', element: page(<NotFound />) },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" richColors closeButton duration={4000} />
    </AuthProvider>
  );
}
