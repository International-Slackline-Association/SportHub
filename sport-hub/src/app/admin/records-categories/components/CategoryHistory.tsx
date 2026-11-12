'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@utils/dates';
import { getCategoryHistory } from '../actions';

type Props = { pk: 'RecordCategory' | 'FirstCategory'; categoryId: string };

/** Who created or changed a category, and why (the audit items of the category). */
export default function CategoryHistory({ pk, categoryId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['category-history', pk, categoryId],
    queryFn: () => getCategoryHistory(pk, categoryId),
  });

  return (
    <div className="stack gap-2 text-sm">
      {isLoading && <span className="text-gray-500">Loading…</span>}
      {data?.length === 0 && <span className="text-gray-500">No changes logged.</span>}
      <ul className="stack gap-1">
        {data?.map(item => (
          <li key={item.at}>
            <span className="text-gray-500">{formatDate(new Date(item.at))}</span>{' '}
            <span className="font-medium">{item.action.replace('_', ' ')}</span>
            {item.byName && <span className="text-gray-500"> by {item.byName}</span>}
            {item.comment && <span>: {item.comment}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
