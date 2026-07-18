import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-on-background text-center px-margin-mobile">
      <Icon name="error" size={40} className="text-secondary" />
      <div>
        <h1 className="text-headline-lg font-headline-lg uppercase">Page Not Found</h1>
        <p className="text-body-md text-secondary mt-2">The page you're looking for doesn't exist or has moved.</p>
      </div>
      <Link to="/vote" className="text-label-md font-label-md text-primary hover:underline uppercase tracking-widest">
        Return to Election Portal
      </Link>
    </div>
  );
}
