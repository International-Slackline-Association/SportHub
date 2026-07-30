"use client";

import { useState } from 'react';
import { FeaturedAthleteSection } from '@ui/FeaturedAthleteCard'
import PageLayout from '@ui/PageLayout'
import RankingsTable from './components/RankingsTable'
import { randomS3Image } from '@utils/images'
import { SUPPORTED_DISCIPLINES } from '@utils/consts'
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const randomDiscipline = () => {
  console.log("Invalid discipline in URL, switching to random discipline");
  const randomIdx = Math.floor(Math.random() * SUPPORTED_DISCIPLINES.length);
  return SUPPORTED_DISCIPLINES[randomIdx];
}

const Page = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Lazy initializer runs once on mount only — the state that follows is
  // real, settable state, so a later router.replace() (which re-renders
  // every useSearchParams() subscriber, including this page) never resets
  // or re-derives it.
  const [discipline, setDiscipline] = useState<Discipline>(() => {
    const rawDiscipline = searchParams.get("discipline") as Discipline;
    return SUPPORTED_DISCIPLINES.includes(rawDiscipline) ? rawDiscipline : randomDiscipline();
  });

  const handleChangeDiscipline = (nextDiscipline: Discipline) => {
    setDiscipline(nextDiscipline);

    // Drop the now-stale ?discipline= param from the URL once the user
    // picks a different one via the table — no navigation, just a shallow
    // URL update (router.replace, no new history entry).
    if (searchParams.has('discipline')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('discipline');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  };

  return (
    <PageLayout
      description="View the latest athlete rankings across all disciplines."
      heroImage={randomS3Image(discipline)}
      title="Rankings"
    >
      <FeaturedAthleteSection discipline={discipline} />
      <section className="p-4 sm:p-0">
        <RankingsTable discipline={discipline} onChangeDiscipline={handleChangeDiscipline} />
      </section>
    </PageLayout>
  );
}

export default Page;
