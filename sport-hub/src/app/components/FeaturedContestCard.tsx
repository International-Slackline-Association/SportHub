import Button from '@ui/Button';
import Image from 'next/image';
import { Badge, BadgeColor, Discipline } from '@ui/Badge';
import { LocationIcon, CalendarIcon, UsersIcon } from '@ui/Icons';
import styles from './styles.module.css';
import { getCountryByCode } from '@utils/countries';
import { ContestData } from '@lib/data-services';
import StackedMediaCard from '@ui/StackedMediaCard';
import { cn } from '@utils/cn';
import { formatDateRange } from '@utils/dates';

interface FeaturedContestCardProps {
  contest: ContestData;
}

const StatusBadgeColors: Record<string, BadgeColor> = {
  UPCOMING: "GREEN",
  LIVE: "RED",
  RECENT: "NEUTRAL",
};

/**
 * FeaturedContestCard component using generic Card component
 * Mobile-first: Stacked on mobile, card layout on desktop
 */
const FeaturedContestCard = ({ contest }: FeaturedContestCardProps) => {
  const {
    eventId,
    name,
    startDate,
    endDate,
    country,
    city,
    discipline,
    thumbnailUrl,
  } = contest;

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate || startDate);

  // TODO: Pull from API data when present
  const isUpcoming = startDateObj > new Date();
  const isLive = startDateObj <= new Date() && endDateObj >= new Date();

  let status = "RECENT";
  if (isUpcoming) {
    status = "UPCOMING";
  } else if (isLive) {
    status = "LIVE";
  }

  const href = `/events/${eventId}`;

  return (
    <StackedMediaCard
      media={thumbnailUrl && (
        <div className={styles.imageWrapper}>
          <Image
            alt={name}
            fill
            src={thumbnailUrl}
            style={{ objectFit: 'contain' }}
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
          <span>{formatDateRange(startDateObj, endDateObj)}</span>
        </div>
        <div className={styles.statsRow}>
          <Discipline variant={discipline} />
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
