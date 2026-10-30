import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Button, Field, FormError, Icon } from '../../components/ui';
import { Brand } from '../../components/Brand';
import { ApiError } from '../../lib/apiClient';
import { useSlowHint } from '../../lib/useSlowHint';
import { useAuth } from './AuthContext';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/** Admin sign-in: split editorial layout on desktop (ink panel + form), single column on phones. */
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
  const slow = useSlowHint(isSubmitting, 8000);

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
    <div className="min-h-[100dvh] grid lg:grid-cols-[1.05fr_1fr] bg-background">
      <aside className="hidden lg:flex relative flex-col justify-between bg-on-background text-on-primary p-12 xl:p-16 overflow-hidden">
        <div className="absolute inset-0 grain opacity-40 invert" aria-hidden="true" />
        <Brand inverse subtitle="Electoral Committee" className="relative" />
        <div className="relative">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-primary-fixed-dim mb-6">Restricted access</p>
          <p className="font-serif text-[3.25rem] xl:text-[3.75rem] leading-[1.02] tracking-[-0.02em] max-w-lg">
            Run a fair election, <span className="italic text-primary-fixed-dim">on the record.</span>
          </p>
          <p className="mt-6 text-on-primary/65 max-w-md">Every sign-in and every administrative action in this portal is permanently written to the audit trail.</p>
        </div>
        <p className="relative font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-on-primary/45">Igarra Development Association</p>
      </aside>

      <main className="flex flex-col">
        <div className="lg:hidden px-6 h-16 flex items-center border-b border-outline-variant">
          <Brand subtitle="Electoral Committee" />
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm animate-rise">
            <p className="eyebrow mb-3">Admin portal</p>
            <h1 className="font-serif text-headline-xl">Sign in</h1>
            <p className="mt-2 text-body-md text-secondary">For authorised electoral officials only.</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Field label="Email address" icon="mail" type="email" autoComplete="username" error={errors.email?.message} {...register('email')} />
              <Field label="Password" icon="lock" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
              <FormError message={serverError} />
              {isSubmitting && slow && (
                <p role="status" className="text-[0.8125rem] text-secondary">
                  The server is waking up — this can take up to a minute…
                </p>
              )}
              <Button type="submit" size="lg" fullWidth loading={isSubmitting} rightIcon="arrow_forward">
                Sign in
              </Button>
            </form>

            <p className="mt-8 pt-6 border-t border-outline-variant text-[0.8125rem] text-secondary flex gap-2">
              <Icon name="info" size={15} className="mt-0.5 shrink-0" />
              Forgot your password? Ask a Super Admin to reset it from Admin accounts.
            </p>
            <Link to="/vote" className="mt-4 inline-block text-[0.8125rem] font-medium text-primary hover:underline underline-offset-4">
              Looking to vote? Go to the voter portal →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
