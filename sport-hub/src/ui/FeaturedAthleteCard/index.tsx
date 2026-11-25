'use client';
import Link from 'next/link';

import { AthleteRanking } from "@lib/data-services";
import { Avatar } from '@ui/Avatar';
import { FeaturedCardGrid } from '@ui/FeaturedCardGrid';
import { CircleFlag } from 'react-circle-flags';
import { cn } from '@utils/cn';
import { Discipline } from '@ui/Badge';
import { getCountryByCode } from '@utils/countries';
import { StackedMediaCard } from '@ui/StackedMediaCard';
import sectionStyles from '@ui/featuredSections.module.css';
import { Alert, Button, EmptyState, Spinner } from '@slacklineinternational/onsight/react';
import { useQuery } from "@tanstack/react-query";

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
  const href = `/athlete/${userId}`;


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
          as={Link}
          variant="secondary"
          href={href}
        >
          View Profile
        </Button>
      </div>
    </StackedMediaCard>
  );
};

export const FeaturedAthleteSection = ({
  discipline,
  season,
  gender,
}: {
  discipline: Discipline;
  season: string;
  gender: Gender;
}) => {
  const { data: athletes, error, isError, isLoading, isSuccess } = useQuery({
    queryKey: ['featured-athletes', discipline, season, gender],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (discipline === 'TRICKLINE') {
        params.set("discipline", 'TRICKLINE_AERIAL');
      } else {
        params.set("discipline", discipline);
      }
      params.set('season', season);
      params.set('gender', gender);
      const url = `/api/athlete/featured?${params.toString()}`;
      const res = await fetch(url);
      const resObj = await res.json();

      if ("error" in resObj) {
        throw new Error(`Failed to fetch featured athletes: ${resObj.error}`);
      }

      return resObj;
    },
  });

  return (
    <section className={sectionStyles.section}>
      <h2 className={sectionStyles.sectionTitle}>
        Featured Athletes {isLoading && <Spinner size="small" label="Loading featured athletes" className="ml-4" />}
      </h2>
      {isError && (
        <Alert variant="danger">{error?.message}</Alert>
      )}
      {isSuccess && !athletes.length && (
        <EmptyState title="No featured athletes" plain>
          No athletes match this season and category.
        </EmptyState>
      )}
      {isSuccess && athletes.length && (
        <FeaturedCardGrid>
          {athletes?.map((athlete: AthleteRanking) => (
            <FeaturedAthleteCard key={athlete.userId} athlete={athlete} />
          ))}
        </FeaturedCardGrid>
      )}
    </section>
  );
};

export default FeaturedAthleteCard;
