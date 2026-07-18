import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge, Button, Field, useToast } from '../../components/ui';
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
import type { ElectionStatus } from '../../features/elections/types';

const electionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  year: z.coerce.number().int().min(2000).max(2200),
  description: z.string().trim().optional(),
});

type ElectionFormData = z.infer<typeof electionSchema>;

const STATUS_BADGE: Record<ElectionStatus, 'neutral' | 'gold' | 'success' | 'error'> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  PAUSED: 'gold',
  CLOSED: 'error',
  ARCHIVED: 'neutral',
};

export function SettingsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useCurrentElection();
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
    formState: { errors, isSubmitting },
  } = useForm<ElectionFormData>({ resolver: zodResolver(electionSchema) });

  useEffect(() => {
    if (election) {
      reset({ title: election.title, year: election.year, description: election.description ?? '' });
    }
  }, [election, reset]);

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

  const onSubmit = (values: ElectionFormData) =>
    runAction(() => updateElection.mutateAsync(values), 'Election details saved.');

  if (isLoading || !election) {
    return (
      <section className="border-b-2 border-on-background pb-6">
        <h1 className="text-headline-xl font-headline-xl uppercase">Settings</h1>
        <p className="text-body-lg text-secondary">Loading election configuration…</p>
      </section>
    );
  }

  const isLocked = election.isLocked;

  return (
    <>
      <LockBanner election={election} />

      <section className="border-b-2 border-on-background pb-6">
        <h1 className="text-headline-xl font-headline-xl uppercase">Settings</h1>
        <p className="text-body-lg text-secondary">Election lifecycle configuration and system preferences.</p>
      </section>

      <div className="bento-grid">
        <div className="col-span-12 lg:col-span-7 bg-surface border border-on-background p-8">
          <h2 className="text-headline-sm font-headline-sm uppercase mb-6 border-b-2 border-primary pb-4">Election Details</h2>
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Election Title" disabled={isLocked} error={errors.title?.message} {...register('title')} />
            <Field label="Year" type="number" disabled={isLocked} error={errors.year?.message} {...register('year')} />
            <Field label="Description" disabled={isLocked} error={errors.description?.message} {...register('description')} />
            <Button type="submit" variant="primary" disabled={isLocked} loading={isSubmitting}>
              Save Changes
            </Button>
          </form>
        </div>

        <div className="col-span-12 lg:col-span-5 bg-surface-container border border-on-background p-8 flex flex-col gap-6">
          <div className="border-b-2 border-primary pb-4 flex items-center justify-between">
            <h2 className="text-headline-sm font-headline-sm uppercase">Election Status</h2>
            <Badge variant={STATUS_BADGE[election.status]}>{election.status}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-surface border border-on-background p-4">
              <p className="text-headline-lg font-headline-lg">{election._count?.positions ?? 0}</p>
              <p className="text-label-sm font-label-sm text-secondary uppercase">Positions</p>
            </div>
            <div className="bg-surface border border-on-background p-4">
              <p className="text-headline-lg font-headline-lg">{election._count?.voters ?? 0}</p>
              <p className="text-label-sm font-label-sm text-secondary uppercase">Registered Voters</p>
            </div>
          </div>

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
                      'Close this election? This immediately locks it — no further votes, tokens, or record changes will be possible until a Super Admin unlocks it.'
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
                      'Close this election? This immediately locks it — no further votes, tokens, or record changes will be possible until a Super Admin unlocks it.'
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
        </div>
      </div>
    </>
  );
}
