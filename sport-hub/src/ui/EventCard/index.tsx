import { cn } from '@utils/cn';
import styles from './styles.module.css';
import type { EventRecord } from '@lib/relational-types';
import { Discipline as DisciplineBadge, Badge } from '@ui/Badge';

type EventLike = Partial<EventRecord> & {
  // Admin form shape uses disciplines array and may not have participants yet
  disciplines?: string[];
  athletes?: Array<unknown>;
  verified?: boolean;
};

type EventDetailsCardProps = {
  event: EventLike;
  className?: string;
	title?: string;
};

const formatDate = (d?: string | Date | null) => {
	if (!d) return '';
	try {
		const date = typeof d === 'string' ? new Date(d) : d;
		if (isNaN(date.getTime())) return '';
		return date.toLocaleDateString('en-GB');
	} catch {
		return '';
	}
};

const formatDiscipline = (disc?: string | string[] | null) => {
	if (!disc) return '';
	return Array.isArray(disc) ? disc.filter(Boolean).join(', ') : disc;
};

const formatPrizeEUR = (value: unknown): string => {
	if (value === null || value === undefined || value === '') return '';
	const num = typeof value === 'string' ? Number(value) : (value as number);
	if (typeof num !== 'number' || Number.isNaN(num)) return String(value ?? '');
	try {
		return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(num);
	} catch {
		return String(num);
	}
};

export function EventDetailsCard({ event, className, title }: EventDetailsCardProps) {
	const {
		date,
		city,
		country,
		name,
		discipline,
		prize,
		// contestsParticipated,
		verified,
	} = event;

	const disciplineList = Array.isArray(discipline) ? (discipline as string[]) : (discipline ? [discipline as string] : []);
	const knownDisciplineVariants = new Set([
		'FREESTYLE_HIGHLINE',
		'RIGGING',
		'SPEED_HIGHLINE',
		'SPEED_SHORT',
		'TRICKLINE',
	]);
	const allKnown = disciplineList.length > 0 && disciplineList.every((d) => knownDisciplineVariants.has(d));

	const headerTitle = title || name;
	const hasMeta = Boolean(date || city || country);

	return (
		<div className={cn('card', className)}>
			{headerTitle ? (
				<div className={styles.header}>
					<h3 className={styles.title}>{headerTitle}</h3>
					{verified != null && (
						<Badge color={verified ? 'GREEN' : 'NEUTRAL'}>
							{verified ? 'ISA Verified' : 'Unverified'}
						</Badge>
					)}
				</div>
			) : null}
			{hasMeta && (
				<div className={styles.metaRow}>
					<span>{formatDate(date)}</span>
					{[city, country].filter(Boolean).length > 0 && (
						<span>{[city, country].filter(Boolean).join(', ')}</span>
					)}
				</div>
			)}
			<div className={styles.divider} />
			<div className={styles.grid}>
				{!hasMeta && (
					<>
						<div className={styles.item}>
							<h3 className={styles.label}>Date</h3>
							<p className={styles.value}>{formatDate(date) || '-'}</p>
						</div>
						<div className={styles.item}>
							<h3 className={styles.label}>Location</h3>
							<p className={styles.value}>{[city, country].filter(Boolean).join(', ') || '-'}</p>
						</div>
					</>
				)}
				<div className={styles.item}>
					<h3 className={styles.label}>Discipline</h3>
					{allKnown ? (
						<div className={styles.badgesRow}>
							{disciplineList.map((d, i) => (
								<DisciplineBadge key={`${d}-${i}`} variant={d as Discipline} />
							))}
						</div>
					) : (
						<p className={styles.value}>{formatDiscipline(discipline) || '-'}</p>
					)}
				</div>
				<div className={styles.item}>
					<h3 className={styles.label}>Prize Value</h3>
					<p className={styles.value}>{(formatPrizeEUR(prize || 0))}</p>
				</div>
				<div className={styles.item}>
					<h3 className={styles.label}>Participants</h3>
					{/* <p className={styles.value}>{contestsParticipated != null ? contestsParticipated : '-'}</p> */}
				</div>
				<div className={styles.item}>
					<h3 className={styles.label}>Status</h3>
					<p className={cn(styles.value, verified ? styles.verified : styles.unverified)}>
						{verified != null ? (verified ? '✅ ISA Verified' : 'Unverified') : '-'}
					</p>
				</div>
			</div>
		</div>
	);
}

