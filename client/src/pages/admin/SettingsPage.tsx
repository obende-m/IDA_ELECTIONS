import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardHeader, CardTitle, ElectionStatusBadge, ErrorState, Field, Icon, PageHeader, PageSkeleton, useConfirm, useToast } from '../../components/ui';
import { useCurrentElection, useUpdateElection, useOpenElection, usePauseElection, useResumeElection, useCloseElection, useArchiveElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import { useAuth } from '../../features/auth/AuthContext';
import { canManageElection } from '../../features/auth/permissions';
import { isoToLocalInput, localInputToIso, timezoneLabel } from '../../lib/datetime';
import { cn } from '../../lib/cn';
import type { ElectionFormValues, ElectionStatus } from '../../features/elections/types';

const electionSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required'),
    year: z.coerce.number().int().min(2000).max(2200),
    description: z.string().trim().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const start = localInputToIso(values.startTime);
    const end = localInputToIso(values.endTime);
    if (values.startTime && !start) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startTime'], message: 'Enter a valid date and time' });
    if (values.endTime && !end) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'Enter a valid date and time' });
    if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'Voting must close after it opens' });
    }
  });

type ElectionFormData = z.infer<typeof electionSchema>;

const LIFECYCLE: { key: ElectionStatus | 'OPEN'; label: string; hint: string }[] = [
  { key: 'DRAFT', label: 'Draft', hint: 'Prepare the ballot and roll' },
  { key: 'OPEN', label: 'Voting', hint: 'Ballots accepted' },
  { key: 'CLOSED', label: 'Closed', hint: 'Results certified & locked' },
  { key: 'ARCHIVED', label: 'Archived', hint: 'Final record' },
];

function stageIndex(status: ElectionStatus) {
  return status === 'DRAFT' ? 0 : status === 'ACTIVE' || status === 'PAUSED' ? 1 : status === 'CLOSED' ? 2 : 3;
}

function formatScheduled(iso: string | null) {
  if (!iso) return 'Not scheduled';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Not scheduled' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function SettingsPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canManage = canManageElection(user?.role);
  const { data, isLoading, isError, error, refetch, isFetching } = useCurrentElection();
  const election = data?.election;

  const updateElection = useUpdateElection();
  const openElection = useOpenElection();
  const pauseElection = usePauseElection();
  const resumeElection = useResumeElection();
  const closeElection = useCloseElection();
  const archiveElection = useArchiveElection();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, dirtyFields, isDirty },
  } = useForm<ElectionFormData>({ resolver: zodResolver(electionSchema) });

  useEffect(() => {
    if (election) {
      reset({ title: election.title, year: election.year, description: election.description ?? '', startTime: isoToLocalInput(election.startTime), endTime: isoToLocalInput(election.endTime) });
    }
  }, [election, reset]);

  const tzLabel = useMemo(() => timezoneLabel(), []);
  const startValue = watch('startTime');
  const endValue = watch('endTime');
  const endIsPast = Boolean(endValue) && new Date(endValue as string).getTime() < Date.now();

  const run = async (action: () => Promise<unknown>, success: string, confirmOpts?: Parameters<typeof confirm>[0]) => {
    if (confirmOpts && !(await confirm(confirmOpts))) return;
    try {
      await action();
      toast({ title: success, variant: 'success' });
    } catch (err) {
      toast({ title: 'Action failed', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const onSubmit = (values: ElectionFormData) => {
    const payload: Partial<ElectionFormValues> = { title: values.title, year: values.year, description: values.description };
    if (dirtyFields.startTime || dirtyFields.endTime) {
      payload.startTime = localInputToIso(values.startTime);
      payload.endTime = localInputToIso(values.endTime);
    }
    return run(() => updateElection.mutateAsync(payload), 'Election details saved');
  };

  if (isLoading) return <PageSkeleton rows={3} />;
  if (isError || !election) {
    return <ErrorState title="Could not load the election" message={error instanceof Error ? error.message : 'No current election was found.'} onRetry={() => refetch()} retrying={isFetching} />;
  }

  const isLocked = election.isLocked;
  const fieldsDisabled = isLocked || !canManage;
  const stage = stageIndex(election.status);
  const closeConfirm = {
    title: 'Close the election?',
    message: 'Voting stops immediately, results are certified and the election is locked. Only a Super Admin can unlock it.',
    confirmLabel: 'Close and certify',
    tone: 'danger' as const,
  };

  return (
    <>
      <LockBanner election={election} />
      <PageHeader kicker="Administration" title="Election settings" description="Details, schedule and the lifecycle of the current election." />

      {!canManage && (
        <div role="note" className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3">
          <Icon name="lock" size={17} className="text-secondary shrink-0 mt-0.5" />
          <p className="text-[0.875rem] text-on-surface-variant">View only — editing details and schedule, and opening, pausing, closing or archiving the election require an Election Committee or Super Admin account.</p>
        </div>
      )}

      {/* Lifecycle */}
      <Card>
        <CardHeader>
          <CardTitle kicker="Lifecycle">Where this election stands</CardTitle>
          <ElectionStatusBadge status={election.status} locked={election.isLocked} />
        </CardHeader>
        <div className="p-5 sm:p-6">
          <ol className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LIFECYCLE.map((s, i) => (
              <li
                key={s.key}
                aria-current={i === stage ? 'step' : undefined}
                className={cn(
                  'rounded-xl border p-4 transition-colors',
                  i === stage ? 'border-on-background bg-on-background text-on-primary' : i < stage ? 'border-outline-variant bg-surface-bright' : 'border-dashed border-outline-variant'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('font-mono text-[0.6875rem]', i === stage ? 'text-primary-fixed-dim' : 'text-secondary')}>{String(i + 1).padStart(2, '0')}</span>
                  {i < stage && <Icon name="check" size={15} className="text-success" />}
                  {i === stage && election.status === 'PAUSED' && <span className="font-mono text-[0.625rem] uppercase text-primary-fixed-dim">Paused</span>}
                </div>
                <p className="mt-3 font-serif text-[1.25rem]">{s.label}</p>
                <p className={cn('text-[0.8125rem]', i === stage ? 'text-on-primary/65' : 'text-secondary')}>{s.hint}</p>
              </li>
            ))}
          </ol>

          {canManage && (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {election.status === 'DRAFT' && (
                <Button leftIcon="lock_open" disabled={isLocked} loading={openElection.isPending} onClick={() => run(() => openElection.mutateAsync(), 'Election opened — voting is live', { title: 'Open voting now?', message: 'Voters with a valid link will be able to cast ballots immediately. Once the first ballot is cast, the ballot can no longer be changed.', confirmLabel: 'Open voting' })}>
                  Open voting now
                </Button>
              )}
              {election.status === 'ACTIVE' && (
                <>
                  <Button variant="secondary" leftIcon="schedule" disabled={isLocked} loading={pauseElection.isPending} onClick={() => run(() => pauseElection.mutateAsync(), 'Voting paused')}>
                    Pause voting
                  </Button>
                  <Button variant="danger" leftIcon="lock" disabled={isLocked} loading={closeElection.isPending} onClick={() => run(() => closeElection.mutateAsync(), 'Election closed and certified', closeConfirm)}>
                    Close &amp; certify
                  </Button>
                </>
              )}
              {election.status === 'PAUSED' && (
                <>
                  <Button leftIcon="lock_open" disabled={isLocked} loading={resumeElection.isPending} onClick={() => run(() => resumeElection.mutateAsync(), 'Voting resumed')}>
                    Resume voting
                  </Button>
                  <Button variant="danger" leftIcon="lock" disabled={isLocked} loading={closeElection.isPending} onClick={() => run(() => closeElection.mutateAsync(), 'Election closed and certified', closeConfirm)}>
                    Close &amp; certify
                  </Button>
                </>
              )}
              {election.status === 'CLOSED' && (
                <Button variant="secondary" loading={archiveElection.isPending} onClick={() => run(() => archiveElection.mutateAsync(), 'Election archived', { title: 'Archive this election?', message: 'A final organisational step. Certified results are not affected.', confirmLabel: 'Archive' })}>
                  Archive election
                </Button>
              )}
              {election.status === 'ARCHIVED' && <p className="text-[0.875rem] text-secondary">This election is archived. Its results are final.</p>}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <CardTitle kicker="Details">Election information</CardTitle>
          </CardHeader>
          <form className="p-5 sm:p-6 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
              <Field label="Election title" disabled={fieldsDisabled} error={errors.title?.message} {...register('title')} />
              <Field label="Year" type="number" disabled={fieldsDisabled} error={errors.year?.message} {...register('year')} />
            </div>
            <Field label="Description" hint="Shown to admins only." disabled={fieldsDisabled} error={errors.description?.message} {...register('description')} />

            <fieldset className="space-y-4 pt-5 border-t border-outline-variant" disabled={fieldsDisabled}>
              <legend className="sr-only">Voting schedule</legend>
              <div>
                <p className="font-medium">Voting schedule</p>
                <p className="mt-1 text-[0.8125rem] text-secondary">
                  The election opens and closes automatically at these times. Leave empty to open or close manually. Times are in{' '}
                  <span className="font-medium text-on-background">{tzLabel}</span> and stored in UTC.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['startTime', 'endTime'] as const).map((key) => (
                  <div key={key}>
                    <Field label={key === 'startTime' ? 'Voting opens' : 'Voting closes'} type="datetime-local" disabled={fieldsDisabled} error={errors[key]?.message} {...register(key)} />
                    {(key === 'startTime' ? startValue : endValue) && !fieldsDisabled && (
                      <button type="button" className="mt-1.5 text-[0.8125rem] font-medium text-primary hover:underline underline-offset-4" onClick={() => setValue(key, '', { shouldDirty: true, shouldValidate: true })}>
                        Clear
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {endIsPast && !fieldsDisabled && (
                <p role="status" className="flex items-center gap-2 text-[0.8125rem] text-warning">
                  <Icon name="warning" size={15} /> The closing time you entered is in the past.
                </p>
              )}
            </fieldset>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={fieldsDisabled || !isDirty} loading={isSubmitting}>
                Save changes
              </Button>
              {isDirty && !fieldsDisabled && (
                <Button type="button" variant="ghost" onClick={() => reset()}>
                  Discard
                </Button>
              )}
              {isLocked && <p className="text-[0.8125rem] text-secondary">Unlock the election to edit.</p>}
            </div>
          </form>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle kicker="At a glance">Summary</CardTitle>
          </CardHeader>
          <dl className="ruled text-[0.875rem]">
            {[
              ['Positions', String(election._count?.positions ?? 0)],
              ['Registered voters', String(election._count?.voters ?? 0)],
              ['Opens', formatScheduled(election.startTime)],
              ['Closes', formatScheduled(election.endTime)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 sm:px-6 py-3.5">
                <dt className="text-secondary">{k}</dt>
                <dd className="font-medium text-right tabular">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
