import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Button, Field, Icon } from '../../components/ui';
import { ApiError } from '../../lib/apiClient';
import { useAuth } from './AuthContext';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Admin sign-in screen. No Stitch mock exists for this screen, so it is composed from the same
 * design tokens/components as the rest of the system (top-app-bar pattern, security-notice bar,
 * high-security form fields, gold primary action) to read as part of the same product.
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/admin/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <header className="w-full flex items-center justify-center h-16 bg-surface border-b-2 border-on-background">
        <span className="text-headline-sm font-headline-sm font-bold text-primary">IDA Election Portal</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-margin-mobile py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-on-background flex items-center justify-center">
              <Icon name="shield" filled size={28} className="text-primary-container" />
            </div>
            <p className="text-label-md font-label-md tracking-widest text-primary uppercase">Electoral Official Access</p>
            <h1 className="text-headline-lg font-headline-lg uppercase">Admin Portal</h1>
          </div>

          <div className="bg-primary-container/10 p-4 border-l-4 border-primary">
            <p className="text-label-sm font-label-sm text-primary uppercase mb-1">Security Notice</p>
            <p className="text-body-md text-on-surface-variant leading-tight">
              This portal is restricted to authorized electoral officials. All access attempts are logged.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field
              label="Email Address"
              icon="mail"
              type="email"
              autoComplete="username"
              error={errors.email?.message}
              {...register('email')}
            />
            <Field
              label="Password"
              icon="lock"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            {serverError && (
              <p role="alert" className="text-label-md font-label-md text-error">
                {serverError}
              </p>
            )}

            <Button type="submit" variant="gold" size="lg" fullWidth uppercase loading={isSubmitting} rightIcon="arrow_forward">
              Sign In
            </Button>
          </form>

          <div className="text-center border-t border-outline-variant pt-6">
            <a className="text-label-md font-label-md text-primary hover:underline" href="#">
              Forgot your password?
            </a>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center border-t border-outline-variant">
        <p className="text-label-sm font-label-sm text-secondary opacity-60">
          © 2026 Igarra Development Association (IDA). Secure Electronic Voting System.
        </p>
      </footer>
    </div>
  );
}
