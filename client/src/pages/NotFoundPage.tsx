import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';

export function NotFoundPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="h-16 px-6 flex items-center border-b border-outline-variant">
        <Link to="/vote" className="rounded-lg">
          <Brand />
        </Link>
      </header>
      <main className="flex-1 flex items-center px-6">
        <div className="max-w-2xl mx-auto w-full animate-rise">
          <p className="font-serif text-[6rem] sm:text-[8rem] leading-none text-outline-variant tabular">404</p>
          <h1 className="mt-4 font-serif text-headline-xl">This page isn't on the ballot</h1>
          <p className="mt-3 text-body-lg text-secondary">The address may be mistyped, or the page has moved.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/vote" className="inline-flex items-center h-11 px-5 rounded-lg bg-primary text-on-primary text-[0.875rem] font-medium hover:bg-primary-hover">
              Go to the voter portal
            </Link>
            <Link to="/admin" className="inline-flex items-center h-11 px-5 rounded-lg border border-outline-variant text-[0.875rem] font-medium hover:border-outline">
              Admin sign-in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
