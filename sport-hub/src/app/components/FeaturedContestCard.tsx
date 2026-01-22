import { Card } from '@ui/Card';
import Button from '@ui/Button';
import { Badge, BadgeColor, Discipline } from '@ui/Badge';
import { LocationIcon, CalendarIcon, UsersIcon, TrophyIcon } from '@ui/Icons';
import styles from './styles.module.css';
import { getCountryByCode } from '@utils/countries';
import { cn } from '@utils/cn';
import { ContestData } from '@lib/data-services';

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

const formatPrize = (prize?: number): string => {
  if (!prize || prize <= 0) return '';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(prize);
  } catch {
    return `$${prize}`;
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
    prize,
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

  return (
    <Card
      className={styles.featuredContestCard}
      image={thumbnailUrl ? {
        src: thumbnailUrl,
        alt: name,
      } : undefined}
      layout="vertical"
      shadow="subtle"
    >
      <div className={styles.content}>
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
          {prize && prize > 0 && (
            <div className={cn(styles.stat, styles.prize)}>
              <TrophyIcon size={14} />
              <span>{formatPrize(prize)}</span>
            </div>
          )}
        </div>
        <Button
          as="link"
          variant={isUpcoming ? 'primary' : 'default'}
          href={`/events/${eventId}`}
        >
          {isUpcoming ? 'Register Now' : 'View Results'}
        </Button>
      </div>
    </Card>
  );
};

export default FeaturedContestCard;
