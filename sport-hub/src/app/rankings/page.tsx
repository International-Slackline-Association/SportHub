"use client";

import { useState } from 'react';
import { FeaturedAthleteSection } from '@ui/FeaturedAthleteCard'
import PageLayout from '@ui/PageLayout'
import RankingsTable from './components/RankingsTable'
import { randomS3Image } from '@utils/images'
import { SUPPORTED_DISCIPLINES } from '@utils/consts'
import { useSearchParams } from 'next/navigation';

const randomDiscipline = () => {
  console.log("Invalid discipline in URL, switching to random discipline");
  const randomIdx = Math.floor(Math.random() * SUPPORTED_DISCIPLINES.length);
  return SUPPORTED_DISCIPLINES[randomIdx];
}

const Page = () => {
  const searchParams = useSearchParams();
  // Computed once via the lazy useState initializer and never again — the
  // table strips ?discipline= from the URL once you pick a new one there,
  // and useSearchParams() re-renders every subscriber (including this page)
  // when that happens. A plain const here would re-derive from the now-gone
  // param on every such re-render (falling into the "missing" branch and
  // rolling a fresh random discipline each time), which is what was causing
  // the hero image / featured athletes to change along with the table.
  const [initialDiscipline] = useState<Discipline>(() => {
    const rawDiscipline = searchParams.get("discipline") as Discipline;
    return SUPPORTED_DISCIPLINES.includes(rawDiscipline) ? rawDiscipline : randomDiscipline();
  });

  return (
    <PageLayout
      description="View the latest athlete rankings across all disciplines."
      heroImage={randomS3Image(initialDiscipline)}
      title="Rankings"
    >
      <FeaturedAthleteSection discipline={initialDiscipline} />
      <section className="p-4 sm:p-0">
        <RankingsTable initialDiscipline={initialDiscipline} />
      </section>
    </PageLayout>
  );
}

export default Page;
