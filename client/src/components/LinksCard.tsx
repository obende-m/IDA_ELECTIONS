import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, Icon, ProgressBar } from './ui';
import type { LinkStats } from '../features/analytics/types';

/** Voting-link accounting: every link generated, how many were used, how many are still waiting, how many were voided. */
export function LinksCard({ links, showManage = true }: { links?: LinkStats; showManage?: boolean }) {
  if (!links) return null;
  const rows: { label: string; value: number; hint: string; tone?: string }[] = [
    { label: 'Generated', value: links.generated, hint: 'Every link ever created' },
    { label: 'Used to vote', value: links.used, hint: 'One ballot each', tone: 'text-success' },
    { label: 'Awaiting use', value: links.awaiting, hint: 'Live, not yet used' },
    { label: 'Voided', value: links.voided, hint: 'Replaced or revoked', tone: links.voided > 0 ? 'text-warning' : undefined },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle kicker="Accountability">Voting links</CardTitle>
        {showManage && (
          <Link to="/admin/voters" className="text-[0.8125rem] font-medium text-primary hover:underline underline-offset-4">
            Manage
          </Link>
        )}
      </CardHeader>
      <dl className="grid grid-cols-2 gap-px bg-outline-variant">
        {rows.map((r) => (
          <div key={r.label} className="bg-surface-container-lowest p-4 sm:p-5">
            <dt className="eyebrow">{r.label}</dt>
            <dd className={`mt-1.5 font-serif text-[1.75rem] leading-none tabular ${r.tone ?? ''}`}>{r.value.toLocaleString()}</dd>
            <p className="mt-1 text-[0.75rem] text-secondary">{r.hint}</p>
          </div>
        ))}
      </dl>
      <div className="p-4 sm:p-5 space-y-3">
        <div>
          <div className="flex justify-between text-[0.8125rem] mb-1.5">
            <span className="text-secondary">Links used</span>
            <span className="tabular font-medium">{links.usedPct}% of generated</span>
          </div>
          <ProgressBar value={links.usedPct} label="Links used as a share of links generated" />
        </div>
        <p className="flex gap-2 text-[0.75rem] text-secondary">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          {links.votersWithLink.toLocaleString()} voters have a link, {links.votersWithoutLink.toLocaleString()} have none yet. {links.reissued} link
          {links.reissued === 1 ? ' was' : 's were'} re-issued; the earlier link is voided each time. A voter who has voted can never be issued another.
        </p>
      </div>
    </Card>
  );
}
