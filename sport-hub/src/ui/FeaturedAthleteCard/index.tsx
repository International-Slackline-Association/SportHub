'use client';

import { AthleteRanking } from "@lib/data-services";
import { Avatar } from '@ui/Avatar';
import { CardGrid } from '@ui/Card';
import { CircleFlag } from 'react-circle-flags';
import { cn } from '@utils/cn';
import { Discipline } from '@ui/Badge';
import { getCountryByCode } from '@utils/countries';
import { StackedMediaCard } from '@ui/StackedMediaCard';
import pageStyles from '../../app/page.module.css';

export interface FeaturedAthleteCardProps {
  athlete: AthleteRanking;
}

export const FeaturedAthleteCard = ({ athlete }: FeaturedAthleteCardProps) => {
  const {
    country,
    disciplines,
    fullName,
    name,
    profileImage,
    surname,
    userId,
  } = athlete;

  const displayName = fullName || `${name} ${surname || ""}`.trim();
  const abbreviatedName = `${name.toUpperCase().charAt(0)}${surname?.toUpperCase().charAt(0) || ""}`;

  return (
    <StackedMediaCard
      className="p-4"
      media={
        <Avatar
          alt={displayName}
          defaultLabel={abbreviatedName}
          image={profileImage}
        />
      }
      href={`/athlete-profile/${userId}`}
      hoverable
    >
      <div className="stack gap-2 items-center">
        <h3>{fullName}</h3>
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

        <div className={cn("contents", "flex-row", "gap-2", "sm:flex")}>
          {disciplines.map((discipline) => (
            <Discipline variant={discipline} key={discipline} />
          ))}
        </div>
      </div>
    </StackedMediaCard>
  );
};

export const FeaturedAthleteSection = ({ athletes }: { athletes: AthleteRanking[] }) => {
  return (
    <section className={pageStyles.section}>
      <h2 className={pageStyles.sectionTitle}>Featured Athletes</h2>
      <CardGrid columns={athletes.length}>
        {athletes.map(athlete => (
          <FeaturedAthleteCard key={athlete.userId} athlete={athlete} />
        ))}
      </CardGrid>
    </section>
  );
};

export default FeaturedAthleteCard;
