import { ContestData } from "@lib/data-services";
import Image from 'next/image';
import { CardGrid } from '@ui/Card';
import { Discipline } from '@ui/Badge';
import { CircleFlag } from 'react-circle-flags';
import { cn } from '@utils/cn';
import { getCountryByCode } from '@utils/countries';
import { StackedMediaCard } from '@ui/StackedMediaCard';
import pageStyles from '../../app/page.module.css';
import Button from "@ui/Button";
import styles from '../../app/components/styles.module.css';
export interface FeaturedEventCardProps {
  event: ContestData;
}

export const FeaturedEventCard = ({ event }: FeaturedEventCardProps) => {
  const {
    country,
    eventId,
    discipline,
    name,
    thumbnailUrl,
  } = event;
  const href = `/events/${eventId}`;
  return (
    <StackedMediaCard
      className="p-4"
      media={
        <div className={styles.imageWrapper}>
          <Image
            alt={name}
            src={thumbnailUrl || ''}
            fill
          />
        </div>
      }
      href={href}
      hoverable
    >
      <div className="stack gap-2 items-center">
        <h3>{name}</h3>
        {country && (
          <div className={cn("cluster", "gap-2")}>
            <CircleFlag
              countryCode={country.toLowerCase()}
              height={16}
              width={16}
            />
            <span>{getCountryByCode(country)?.name}</span>
          </div>
        )}
        <Discipline variant={discipline} key={discipline} />
        <Button
          as="link"
          variant="secondary"
          href={href}
        >
          View Event
        </Button>
      </div>
    </StackedMediaCard>
  );
};

export const FeaturedEventSection = ({ events }: { events: ContestData[] }) => {
  return (
    <section className={pageStyles.section}>
      <h2 className={pageStyles.sectionTitle}>Featured Events</h2>
      <CardGrid columns={events.length}>
        {events.map(event => (
          <FeaturedEventCard key={event.contestId || `${event.eventId}-${event.discipline}-${event.gender}`} event={event} />
        ))}
      </CardGrid>
    </section>
  );
};

export default FeaturedEventCard;
