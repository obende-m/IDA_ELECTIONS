import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { Button, Icon } from './ui';

/** Top-level router error boundary: also catches failed lazy-chunk loads (e.g. offline, or a deploy replaced the old files). */
export function RouteError() {
  const error = useRouteError();
  const isChunkError =
    error instanceof Error && /dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically/i.test(error.message);
  const status = isRouteErrorResponse(error) ? error.status : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-on-background text-center px-6">
      <Icon name="error" size={40} className="text-secondary" />
      <div className="max-w-md">
        <h1 className="text-headline-lg font-headline-lg uppercase">{status === 404 ? 'Page Not Found' : 'Something Went Wrong'}</h1>
        <p className="text-body-md text-secondary mt-2">
          {isChunkError
            ? 'We could not load this page. Check your internet connection and reload. The site may also have been updated.'
            : 'An unexpected error occurred. Reloading the page usually fixes it.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="primary" leftIcon="refresh" onClick={() => window.location.reload()}>
          Reload
        </Button>
        <Link
          to="/vote"
          className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-label-md font-label-md border border-outline-variant hover:border-on-background"
        >
          Back to portal
        </Link>
      </div>
    </div>
  );
}
