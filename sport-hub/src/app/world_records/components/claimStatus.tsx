import type { ClaimStatus } from '@lib/relational-types';
import { cn } from '@utils/cn';

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: 'Draft',
  pending: 'Under review',
  changes_requested: 'Changes requested',
  published: 'Published',
  rejected: 'Rejected',
  historical: 'Former World Record',
};

const STATUS_CLASSES: Record<ClaimStatus, string> = {
  draft: 'bg-muted text-default border-default',
  pending: 'bg-status-info-bg text-link border-default',
  changes_requested: 'bg-status-warning-bg text-status-warning-fg border-strong',
  published: 'bg-status-success-bg text-success border-default',
  rejected: 'bg-status-danger-bg text-danger border-danger',
  historical: 'bg-subtle text-default border-default',
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span className={cn('inline-flex text-xs font-medium px-2 py-0.5 rounded border whitespace-nowrap', STATUS_CLASSES[status])}>
      {CLAIM_STATUS_LABELS[status]}
    </span>
  );
}
