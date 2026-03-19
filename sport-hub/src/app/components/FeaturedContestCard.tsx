import Button from '@ui/Button';
import Image from 'next/image';
import { Badge, BadgeColor, Discipline } from '@ui/Badge';
import { LocationIcon, CalendarIcon, UsersIcon } from '@ui/Icons';
import styles from './styles.module.css';
import { getCountryByCode } from '@utils/countries';
import { ContestData } from '@lib/data-services';
import StackedMediaCard from '@ui/StackedMediaCard';
import { cn } from '@utils/cn';


interface FeaturedContestCardProps {
  contest: ContestData;
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const StatusBadgeColors: Record<string, BadgeColor> = {
  UPCOMING: "GREEN",
  LIVE: "RED",
  RECENT: "NEUTRAL",
};

const isSameDate = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

/**
 * FeaturedContestCard component using generic Card component
 * Mobile-first: Stacked on mobile, card layout on desktop
 */
const FeaturedContestCard = ({ contest }: FeaturedContestCardProps) => {
  const {
    eventId,
    name,
    date,
    country,
    city,
    discipline,
    athletes,
    thumbnailUrl,
  } = contest;
  const dateObj = new Date(date);

  // TODO: Pull from API data when present
  const isUpcoming = dateObj > new Date();
  // const isRecent = dateObj < Date.now(); // TODO: Use for status indicator
  const isLive = isSameDate(dateObj, new Date());

  let status = "RECENT";
  if (isUpcoming) {
    status = "UPCOMING";
  } else if (isLive) {
    status = "LIVE";
  }

  const href = `/events/${eventId}`;

  return (
    <StackedMediaCard
      hoverable
      media={thumbnailUrl && (
        <div className={styles.imageWrapper}>
          <Image
            alt={name}
            src={thumbnailUrl}
            fill
          />
        </div>
      )}
      mobileDirection="vertical"
      padding="p-0"
    >
      <div className={cn(styles.content, 'px-4')}>
        <div className={styles.titleRow}>
          <h3 className={styles.name}>{name}</h3>
          <Badge color={StatusBadgeColors[status]}>
            {status}
          </Badge>
        </div>
        <div className={styles.metaItem}>
          <LocationIcon size={14} />
          <span>{city}, {getCountryByCode(country)?.name}</span>
        </div>
        <div className={styles.metaItem}>
          <CalendarIcon size={14} />
          <span>{formatDate(date)}</span>
        </div>
        <div className={styles.statsRow}>
          <Discipline variant={discipline} />
          <div className={styles.stat}>
            <UsersIcon size={14} />
            <span>{athletes.length}</span>
          </div>
        </div>
        <Button
          as="link"
          variant={isUpcoming ? 'primary' : 'default'}
          href={href}
        >
          {isUpcoming ? 'Register Now' : 'View Results'}
        </Button>
      </div>
    </StackedMediaCard>
  );
};

export default FeaturedContestCard;
