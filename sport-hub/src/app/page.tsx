export const dynamic = 'force-dynamic';

import PageLayout from '@ui/PageLayout';
import { FeaturedAthleteCard } from '@ui/FeaturedAthleteCard';
import FeaturedContestCard from './components/FeaturedContestCard';
import styles from '@ui/featuredSections.module.css';
import { FeaturedCardGrid } from '@ui/FeaturedCardGrid';
import { DisciplineHeroSection } from './components/DisciplineHeroSection';
import { ContestData, getContestsData, getFeaturedAthletes } from '@lib/data-services';


const getFeaturedContests = async () => {
  const allEvents = await getContestsData();
  const featuredComps = allEvents
    .filter(event => {
        const isWorldTier = event.contestSize === 'WORLD_CUP' || event.contestSize === 'WORLD_CHAMPIONSHIP';
        const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;
        const isRecent = (new Date().getTime() - new Date(event.startDate).getTime()) < twoYears;
        const hasProfileImage = !!event.thumbnailUrl;
        return isWorldTier && isRecent && hasProfileImage;
      });

  const randomIndex = () => Math.floor(Math.random() * featuredComps.length);

  // Avoid selecting contests from the same event
  let selectedComps: ContestData[];
  let hasDuplicateEvent;
  do {
    selectedComps = [
      featuredComps[randomIndex()],
      featuredComps[randomIndex()],
      featuredComps[randomIndex()],
    ];
    hasDuplicateEvent = selectedComps.some((comp, index) => {
      return selectedComps.findIndex(c => c.eventId === comp.eventId) !== index;
    });
  } while (hasDuplicateEvent);

  return selectedComps;
};

export default async function Home() {
  let featuredContestsData: Awaited<ReturnType<typeof getFeaturedContests>> = [];
  let featuredAthletesData: Awaited<ReturnType<typeof getFeaturedAthletes>> = [];
  let debugError: string | null = null;

  try {
    [featuredContestsData, featuredAthletesData] = await Promise.all([
      getFeaturedContests(),
      getFeaturedAthletes(),
    ]);
  } catch (err) {
    debugError = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error('[Home] data fetch failed:', err, debugError);
  }

  return (
    <PageLayout
      title="Slackline Sport Hub"
      description="Your destination for athlete rankings, competitions, and world records."
    >

      {/* Hero + Rankings/Disciplines — client component handles crossfade on hover */}
      <DisciplineHeroSection />

      {/* Featured Contests Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Featured Competitions</h2>
          <p className={styles.sectionSubtitle}>
            Stay up to date with the latest competitions and events in the slacklining community.
          </p>
        </div>

        <FeaturedCardGrid>
          {featuredContestsData.map(contest => (
            <FeaturedContestCard
              key={contest.contestId || `${contest.eventId}-${contest.discipline}-${contest.gender}`}
              contest={contest}
            />
          ))}
        </FeaturedCardGrid>
      </section>

      {/* Featured Athletes Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Featured Athletes</h2>

        <FeaturedCardGrid>
          {featuredAthletesData.slice(0, 3).map(athlete => (
            <FeaturedAthleteCard key={athlete.userId} athlete={athlete} />
          ))}
        </FeaturedCardGrid>
      </section>
    </PageLayout>
  );
}
