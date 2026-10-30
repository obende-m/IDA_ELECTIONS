import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { Button, Icon } from './ui';

/** Top-level router error boundary: also catches failed lazy-chunk loads (offline, or a deploy replaced the old files). */
export function RouteError() {
  const error = useRouteError();
  const isChunkError = error instanceof Error && /dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically/i.test(error.message);
  const status = isRouteErrorResponse(error) ? error.status : null;

  return (
    <div className="min-h-[100dvh] flex items-center bg-background px-6">
      <div role="alert" className="max-w-xl mx-auto w-full animate-rise">
        <span className="w-12 h-12 rounded-2xl bg-error-container text-error flex items-center justify-center mb-6">
          <Icon name={isChunkError ? 'wifi_off' : 'error'} size={22} />
        </span>
        <h1 className="font-serif text-headline-xl">{status === 404 ? 'Page not found' : isChunkError ? "This page couldn't load" : 'Something went wrong'}</h1>
        <p className="mt-3 text-body-lg text-secondary">
          {isChunkError ? 'Check your internet connection and reload — the site may also have just been updated.' : 'An unexpected error occurred. Reloading the page usually fixes it. No vote is ever submitted by an error screen.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button leftIcon="refresh" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Link to="/vote" className="inline-flex items-center h-11 px-5 rounded-lg border border-outline-variant text-[0.875rem] font-medium hover:border-outline">
            Back to the portal
          </Link>
        </div>
      </div>
    </div>
  );
}
