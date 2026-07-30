"use client";

import { useEffect, useState } from 'react';
import { FeaturedAthleteSection } from '@ui/FeaturedAthleteCard'
import PageLayout from '@ui/PageLayout'
import RankingsTable from './components/RankingsTable'
import { randomS3Image } from '@utils/images'
import { MAP_DISCIPLINE_ENUM_TO_NAME, SUPPORTED_DISCIPLINES } from '@utils/consts'
import { useSearchParams } from 'next/navigation';

const randomDiscipline = () => {
  console.log("Invalid discipline in URL, switching to random discipline");
  const randomIdx = Math.floor(Math.random() * SUPPORTED_DISCIPLINES.length);
  return SUPPORTED_DISCIPLINES[randomIdx];
}

const Page = () => {
  const searchParams = useSearchParams();
  const initialDiscipline = searchParams.get("initialDiscipline") as Discipline;
  const [discipline, setDiscipline] = useState<Discipline>(initialDiscipline || randomDiscipline());

  useEffect(() => {
    if (!SUPPORTED_DISCIPLINES.includes(initialDiscipline as Discipline)) {
      setDiscipline(randomDiscipline());
    }
  }, [initialDiscipline]);

  return (
    <PageLayout
      description="View the latest athlete rankings across all disciplines."
      heroImage={randomS3Image(discipline)}
      title="Rankings"
    >
      <FeaturedAthleteSection discipline={discipline} />
      <section className="p-4 sm:p-0">
        <RankingsTable
          discipline={discipline}
          onChangeDiscipline={(enumValue: string) => {
            const nextDiscipline = MAP_DISCIPLINE_ENUM_TO_NAME[Number(enumValue)]
            setDiscipline(nextDiscipline);
          }}
        />
      </section>
    </PageLayout>
  );
}

export default Page;
