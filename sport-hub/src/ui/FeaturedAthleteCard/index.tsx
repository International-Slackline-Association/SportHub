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
import Button from "@ui/Button";
import { useQuery } from "@tanstack/react-query";
import Spinner from "@ui/Spinner";
import { Alert } from "@ui/Alert";

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
  const href = `/athlete-profile/${userId}`;


  return (
    <StackedMediaCard
      className="px-4 pt-8"
      media={
        <Avatar
          alt={displayName}
          defaultLabel={abbreviatedName}
          image={profileImage}
          size="small"
        />
      }
      desktopDirection="horizontal"
      mobileDirection="vertical"
    >
      <div className="stack gap-1 items-center">
        <div className="flex flex-row items-center gap-2">
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
        </div>
        <div className={cn("contents", "flex-row", "gap-2", "sm:flex")}>
          {disciplines.map((discipline) => (
            <Discipline variant={discipline} key={discipline} />
          ))}
        </div>
        <Button
          as="link"
          variant="secondary"
          href={href}
        >
          View Profile
        </Button>
      </div>
    </StackedMediaCard>
  );
};

export const FeaturedAthleteSection = ({ discipline }: { discipline: Discipline }) => {
  const { data: athletes, error, isError, isLoading, isSuccess } = useQuery({
    queryKey: ['featured-athletes', discipline],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (discipline === 'TRICKLINE') {
        params.set("discipline", 'TRICKLINE_AERIAL');
      } else {
        params.set("discipline", discipline);
      }
      const url = `/api/athlete/featured?${params.toString()}`;
      return (await fetch(url)).json();
    },
  });

  return (
    <section className={pageStyles.section}>
      <h2 className={pageStyles.sectionTitle}>
        Featured Athletes {isLoading && <Spinner className="ml-4" />}
      </h2>
      {isError && (
        <Alert variant="error">Error loading featured athletes: {error.message}</Alert>
      )}
      {isSuccess && !athletes.length && (
        <Alert variant="error">No featured athletes found</Alert>
      )}
      {isSuccess && athletes.length && (
        <CardGrid columns={athletes.length}>
          {athletes?.map((athlete: AthleteRanking) => (
            <FeaturedAthleteCard key={athlete.userId} athlete={athlete} />
          ))}
        </CardGrid>
      )}
    </section>
  );
};

export default FeaturedAthleteCard;
