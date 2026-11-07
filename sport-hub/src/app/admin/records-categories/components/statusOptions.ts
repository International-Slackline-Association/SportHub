import type { FirstCategoryStatus, RecordCategoryStatus } from '@lib/relational-types';

export const RECORD_STATUSES: RecordCategoryStatus[] = ['active', 'unchallenged', 'archived'];
export const FIRST_STATUSES: FirstCategoryStatus[] = ['active', 'archived'];

const toOption = (status: string): Option => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) });

export const RECORD_STATUS_OPTIONS: Option[] = RECORD_STATUSES.map(toOption);
export const FIRST_STATUS_OPTIONS: Option[] = FIRST_STATUSES.map(toOption);
