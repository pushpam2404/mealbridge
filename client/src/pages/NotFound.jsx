import { Container, Button } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <Container className="py-20 sm:py-28">
      <div className="ticket mx-auto max-w-md p-8 text-center">
        <p className="display num text-7xl text-leaf">404</p>
        <h1 className="mt-4 text-2xl font-bold">This page isn’t on the menu</h1>
        <p className="mt-2 text-ink-soft">The link may be old, or the listing may have been removed.</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button to="/browse">Browse open listings</Button>
          <Button to="/" variant="secondary">
            Go home
          </Button>
        </div>
      </div>
    </Container>
  );
}
