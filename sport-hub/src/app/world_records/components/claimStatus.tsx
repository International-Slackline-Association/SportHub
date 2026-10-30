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
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  pending: 'bg-blue-50 text-blue-700 border-blue-200',
  changes_requested: 'bg-amber-50 text-amber-800 border-amber-200',
  published: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  historical: 'bg-gray-50 text-gray-600 border-gray-200',
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span className={cn('inline-flex text-xs font-medium px-2 py-0.5 rounded border whitespace-nowrap', STATUS_CLASSES[status])}>
      {CLAIM_STATUS_LABELS[status]}
    </span>
  );
}
