export const dynamic = 'force-dynamic';

import PageLayout from '@ui/PageLayout';
import { FeaturedAthleteCard } from '@ui/FeaturedAthleteCard';
import FeaturedContestCard from './components/FeaturedContestCard';
import { CardGrid } from '@ui/Card';
import styles from './page.module.css';
import { DisciplineHeroSection } from './components/DisciplineHeroSection';
import { ContestData, getContestsData, getFeaturedAthletes, sortByDateRangeDesc } from '@lib/data-services';


const NUM_FEATURED_EVENTS = 3;
const NUM_FEATURED_ATHLETES = 3;

const getFeaturedContests = async () => {
  const allEvents = await getContestsData();
  const featuredComps = allEvents
    .filter(event => {
        const isWorldTier = event.category < 2; // World Cup or World Championship
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
      getFeaturedAthletes(undefined, NUM_FEATURED_ATHLETES),
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

        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:hidden">
          {featuredContestsData.map(contest => (
            <div key={contest.contestId || `${contest.eventId}-${contest.discipline}-${contest.gender}`} className="min-w-72 shrink-0 snap-start">
              <FeaturedContestCard contest={contest} />
            </div>
          ))}
        </div>

        <div className="hidden sm:block">
          <CardGrid columns={NUM_FEATURED_EVENTS}>
            {featuredContestsData.map(contest => (
              <FeaturedContestCard key={contest.contestId || `${contest.eventId}-${contest.discipline}-${contest.gender}`} contest={contest} />
            ))}
          </CardGrid>
        </div>
      </section>

      {/* Featured Athletes Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Featured Athletes</h2>

        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:hidden">
          {featuredAthletesData.slice(0, 3).map(athlete => (
            <div key={athlete.userId} className="min-w-72 shrink-0 snap-start">
              <FeaturedAthleteCard athlete={athlete} />
            </div>
          ))}
        </div>

        <div className="hidden sm:block">
          <CardGrid columns={NUM_FEATURED_ATHLETES}>
            {featuredAthletesData.slice(0, 3).map(athlete => (
              <FeaturedAthleteCard key={athlete.userId} athlete={athlete}/>
            ))}
          </CardGrid>
        </div>
      </section>
    </PageLayout>
  );
}
