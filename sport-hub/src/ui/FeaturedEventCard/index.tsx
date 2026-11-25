import Link from 'next/link';
import { ContestData } from "@lib/data-services";
import Image from 'next/image';
import { FeaturedCardGrid } from '@ui/FeaturedCardGrid';
import { Discipline } from '@ui/Badge';
import { CircleFlag } from 'react-circle-flags';
import { cn } from '@utils/cn';
import { getCountryByCode } from '@utils/countries';
import { StackedMediaCard } from '@ui/StackedMediaCard';
import sectionStyles from '@ui/featuredSections.module.css';
import { Button } from '@slacklineinternational/onsight/react';
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
            fill
            src={thumbnailUrl || ''}
            style={{ objectFit: 'contain' }}
          />
        </div>
      }
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
          as={Link}
          variant="secondary"
          href={href}
        >
          View Competition
        </Button>
      </div>
    </StackedMediaCard>
  );
};

export const FeaturedEventSection = ({ events }: { events: ContestData[] }) => {
  return (
    <section className={sectionStyles.section}>
      <h2 className={sectionStyles.sectionTitle}>Featured Competitions</h2>
      <FeaturedCardGrid>
        {events.map(event => (
          <FeaturedEventCard key={event.contestId || `${event.eventId}-${event.discipline}-${event.gender}`} event={event} />
        ))}
      </FeaturedCardGrid>
    </section>
  );
};

export default FeaturedEventCard;
