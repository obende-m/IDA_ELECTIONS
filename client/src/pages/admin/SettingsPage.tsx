import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge, Button, ErrorState, Field, Icon, LoadingState, useToast } from '../../components/ui';
import {
  useCurrentElection,
  useUpdateElection,
  useOpenElection,
  usePauseElection,
  useResumeElection,
  useCloseElection,
  useArchiveElection,
} from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import { useAuth } from '../../features/auth/AuthContext';
import { canManageElection } from '../../features/auth/permissions';
import { isoToLocalInput, localInputToIso, timezoneLabel } from '../../lib/datetime';
import type { ElectionFormValues, ElectionStatus } from '../../features/elections/types';

const electionSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required'),
    year: z.coerce.number().int().min(2000).max(2200),
    description: z.string().trim().optional(),
    // datetime-local values: local wall-clock time, '' when unset. Converted to ISO UTC on submit.
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const start = localInputToIso(values.startTime);
    const end = localInputToIso(values.endTime);
    if (values.startTime && !start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startTime'], message: 'Enter a valid date and time' });
    }
    if (values.endTime && !end) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'Enter a valid date and time' });
    }
    if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'Voting must close after it opens' });
    }
  });

type ElectionFormData = z.infer<typeof electionSchema>;

const STATUS_BADGE: Record<ElectionStatus, 'neutral' | 'gold' | 'success' | 'error'> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  PAUSED: 'gold',
  CLOSED: 'error',
  ARCHIVED: 'neutral',
};

const PERMISSION_NOTE =
  'View only: only Election Committee and Super Admin accounts can edit the election details and schedule, or open, pause, resume, close, or archive the election.';

function formatScheduled(iso: string | null): string {
  if (!iso) return 'Not scheduled';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Not scheduled' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function SettingsPage() {
  const { toast } = useToast();
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
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ElectionFormData>({ resolver: zodResolver(electionSchema) });

  useEffect(() => {
    if (election) {
      reset({
        title: election.title,
        year: election.year,
        description: election.description ?? '',
        startTime: isoToLocalInput(election.startTime),
        endTime: isoToLocalInput(election.endTime),
      });
    }
  }, [election, reset]);

  const tzLabel = useMemo(() => timezoneLabel(), []);
  const startValue = watch('startTime');
  const endValue = watch('endTime');
  const endIsPast = Boolean(endValue) && new Date(endValue as string).getTime() < Date.now();

  const runAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
    confirmMessage?: string
  ) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    try {
      await action();
      toast({ title: successMessage, variant: 'success' });
    } catch (err) {
      toast({ title: 'Action failed', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const onSubmit = (values: ElectionFormData) => {
    const payload: Partial<ElectionFormValues> = {
      title: values.title,
      year: values.year,
      description: values.description,
    };
    // Only send the schedule when the admin touched it; '' / invalid -> null clears it server-side.
    if (dirtyFields.startTime || dirtyFields.endTime) {
      payload.startTime = localInputToIso(values.startTime);
      payload.endTime = localInputToIso(values.endTime);
    }
    return runAction(() => updateElection.mutateAsync(payload), 'Election details saved.');
  };

  if (isLoading) {
    return (
      <>
        <section className="border-b border-outline-variant pb-6">
          <h1 className="text-headline-lg-mobile md:text-headline-xl font-headline-xl uppercase">Settings</h1>
        </section>
        <LoadingState label="Loading election configuration…" hint="If the server has been idle this can take up to a minute." />
      </>
    );
  }

  if (isError || !election) {
    return (
      <>
        <section className="border-b border-outline-variant pb-6">
          <h1 className="text-headline-lg-mobile md:text-headline-xl font-headline-xl uppercase">Settings</h1>
        </section>
        <ErrorState
          title="Could not load the election"
          message={error instanceof Error ? error.message : 'No current election was found.'}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      </>
    );
  }

  const isLocked = election.isLocked;
  const fieldsDisabled = isLocked || !canManage;

  return (
    <>
      <LockBanner election={election} />

      <section className="border-b border-outline-variant pb-6">
        <h1 className="text-headline-lg-mobile md:text-headline-xl font-headline-xl uppercase">Settings</h1>
        <p className="text-body-lg text-secondary">Election lifecycle configuration and system preferences.</p>
      </section>

      {!canManage && (
        <div role="note" className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container px-4 py-3">
          <Icon name="info" className="text-secondary shrink-0" />
          <p className="text-body-md text-on-surface-variant">{PERMISSION_NOTE}</p>
        </div>
      )}

      <div className="bento-grid">
        <div className="col-span-12 lg:col-span-7 bg-surface border border-outline-variant rounded-xl shadow-sm p-5 sm:p-8">
          <h2 className="text-headline-sm font-headline-sm uppercase mb-6 border-b border-primary-container/60 pb-4">Election Details</h2>
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Election Title" disabled={fieldsDisabled} error={errors.title?.message} {...register('title')} />
            <Field label="Year" type="number" disabled={fieldsDisabled} error={errors.year?.message} {...register('year')} />
            <Field label="Description" disabled={fieldsDisabled} error={errors.description?.message} {...register('description')} />

            <fieldset className="space-y-4 rounded-lg border border-outline-variant p-4" disabled={fieldsDisabled}>
              <legend className="px-2 text-label-md font-label-md uppercase tracking-widest text-secondary">Voting Schedule</legend>
              <p className="text-body-md text-secondary">
                When set, the election opens and closes automatically at these times, with no need to press Open or Close.
                Leave a field empty for no scheduled time (you can still open or close manually). Times are in your
                timezone: <span className="font-bold text-on-background">{tzLabel}</span>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Field
                    label="Voting opens"
                    type="datetime-local"
                    disabled={fieldsDisabled}
                    error={errors.startTime?.message}
                    {...register('startTime')}
                  />
                  {startValue && !fieldsDisabled && (
                    <button
                      type="button"
                      className="mt-1 min-h-9 text-label-sm font-label-sm text-primary underline"
                      onClick={() => setValue('startTime', '', { shouldDirty: true, shouldValidate: true })}
                    >
                      Clear opening time
                    </button>
                  )}
                </div>
                <div>
                  <Field
                    label="Voting closes"
                    type="datetime-local"
                    disabled={fieldsDisabled}
                    error={errors.endTime?.message}
                    {...register('endTime')}
                  />
                  {endValue && !fieldsDisabled && (
                    <button
                      type="button"
                      className="mt-1 min-h-9 text-label-sm font-label-sm text-primary underline"
                      onClick={() => setValue('endTime', '', { shouldDirty: true, shouldValidate: true })}
                    >
                      Clear closing time
                    </button>
                  )}
                </div>
              </div>

              {endIsPast && !fieldsDisabled && (
                <p role="status" className="text-label-md font-label-md text-on-primary-container">
                  The closing time you entered is in the past.
                </p>
              )}
              <p className="text-label-sm font-label-sm text-secondary">
                Stored in UTC and shown in your local time, so colleagues in other timezones see the same moment in theirs.
              </p>
            </fieldset>

            {isLocked && (
              <p className="text-label-md font-label-md text-secondary">The election is locked. Unlock it to change these settings.</p>
            )}
            <Button type="submit" variant="primary" disabled={fieldsDisabled} loading={isSubmitting}>
              Save Changes
            </Button>
          </form>
        </div>

        <div className="col-span-12 lg:col-span-5 bg-surface-container border border-outline-variant rounded-xl shadow-sm p-5 sm:p-8 flex flex-col gap-6">
          <div className="border-b border-primary-container/60 pb-4 flex items-center justify-between gap-3">
            <h2 className="text-headline-sm font-headline-sm uppercase">Election Status</h2>
            <Badge variant={STATUS_BADGE[election.status]}>{election.status}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-surface border border-outline-variant rounded-lg shadow-sm p-4">
              <p className="text-headline-lg font-headline-lg">{election._count?.positions ?? 0}</p>
              <p className="text-label-sm font-label-sm text-secondary uppercase">Positions</p>
            </div>
            <div className="bg-surface border border-outline-variant rounded-lg shadow-sm p-4">
              <p className="text-headline-lg font-headline-lg">{election._count?.voters ?? 0}</p>
              <p className="text-label-sm font-label-sm text-secondary uppercase">Registered Voters</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-2 text-body-md">
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">Opens</dt>
              <dd className="font-bold text-right">{formatScheduled(election.startTime)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">Closes</dt>
              <dd className="font-bold text-right">{formatScheduled(election.endTime)}</dd>
            </div>
          </dl>

          {canManage ? (
            <div className="flex flex-col gap-3">
              {election.status === 'DRAFT' && (
                <Button
                  variant="gold"
                  uppercase
                  disabled={isLocked}
                  loading={openElection.isPending}
                  onClick={() => runAction(() => openElection.mutateAsync(), 'Election opened. Voting is now active.')}
                >
                  Open Election
                </Button>
              )}
              {election.status === 'ACTIVE' && (
                <>
                  <Button
                    variant="secondary"
                    uppercase
                    disabled={isLocked}
                    loading={pauseElection.isPending}
                    onClick={() => runAction(() => pauseElection.mutateAsync(), 'Election paused.')}
                  >
                    Pause Election
                  </Button>
                  <Button
                    variant="danger"
                    uppercase
                    disabled={isLocked}
                    loading={closeElection.isPending}
                    onClick={() =>
                      runAction(
                        () => closeElection.mutateAsync(),
                        'Election closed and locked.',
                        'Close this election? This immediately locks it: no further votes, tokens, or record changes will be possible until a Super Admin unlocks it.'
                      )
                    }
                  >
                    Close Election
                  </Button>
                </>
              )}
              {election.status === 'PAUSED' && (
                <>
                  <Button
                    variant="gold"
                    uppercase
                    disabled={isLocked}
                    loading={resumeElection.isPending}
                    onClick={() => runAction(() => resumeElection.mutateAsync(), 'Election resumed.')}
                  >
                    Resume Election
                  </Button>
                  <Button
                    variant="danger"
                    uppercase
                    disabled={isLocked}
                    loading={closeElection.isPending}
                    onClick={() =>
                      runAction(
                        () => closeElection.mutateAsync(),
                        'Election closed and locked.',
                        'Close this election? This immediately locks it: no further votes, tokens, or record changes will be possible until a Super Admin unlocks it.'
                      )
                    }
                  >
                    Close Election
                  </Button>
                </>
              )}
              {election.status === 'CLOSED' && (
                <Button
                  variant="secondary"
                  uppercase
                  loading={archiveElection.isPending}
                  onClick={() =>
                    runAction(
                      () => archiveElection.mutateAsync(),
                      'Election archived.',
                      'Archive this election? This is a final organizational step and does not affect certified results.'
                    )
                  }
                >
                  Archive Election
                </Button>
              )}
              {election.status === 'ARCHIVED' && (
                <p className="text-body-md text-secondary italic">This election has been archived. Its results are final.</p>
              )}
            </div>
          ) : (
            <p className="text-body-md text-secondary italic">
              Election lifecycle actions (open, pause, resume, close, archive) are only available to Election Committee and Super Admin
              accounts.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
