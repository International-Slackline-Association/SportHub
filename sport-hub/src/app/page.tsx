import PageLayout from '@ui/PageLayout';
import DisciplineCard from './components/DisciplineCard';
import { FeaturedAthleteSection } from '@ui/FeaturedAthleteCard';
import FeaturedContestCard from './components/FeaturedContestCard';
import { TrophyIcon } from '@ui/Icons';
import { CardGrid } from '@ui/Card';
import styles from './page.module.css';
import { FIGMA_IMAGES } from '@utils/consts';
import { getContestsData, getFeaturedAthletes } from '@lib/data-services';


const NUM_FEATURED_EVENTS = 3;
const NUM_FEATURED_ATHLETES = 3;

const getFeaturedEvents = async () => {
  const allEvents = await getContestsData();
  return allEvents
    // Example criteria, TODO: Check with Tom on actual criteria
    .filter(event => {
        const isLessThanOneYearAgo = (new Date().getTime() - new Date(event.date).getTime()) < (365 * 24 * 60 * 60 * 1000);
        const hasThumbnail = !!event.thumbnailUrl;
        return isLessThanOneYearAgo && hasThumbnail;
      })
    .slice(0, NUM_FEATURED_EVENTS);
};

export default async function Home() {
  const featuredContestsData = await getFeaturedEvents();
  const featuredAthletesData = await getFeaturedAthletes(NUM_FEATURED_ATHLETES);

  return (
    <PageLayout
      title="Slackline Sport Hub"
      description="Your destination for athlete rankings, events, and world records."
      heroImage={{
        src: FIGMA_IMAGES.hero,
        alt: 'Laax Highline World Championship',
        caption: 'Laax Highline World Championship, 2024',
      }}
    >
      {/* Rankings / Disciplines Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Rankings</h2>
        <CardGrid columns={5}>
          <DisciplineCard discipline="FREESTYLE_HIGHLINE" />
          <DisciplineCard discipline="TRICKLINE" />
          <DisciplineCard discipline="SPEED_HIGHLINE" />
          <DisciplineCard discipline="SPEED_SHORT" />
          <DisciplineCard discipline="RIGGING" />
        </CardGrid>
      </section>

      {/* Featured Contests Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.titleWithIcon}>
            <TrophyIcon size={28} className={styles.trophyIcon} />
            <h2 className={styles.sectionTitle}>Featured Contests</h2>
          </div>
          <p className={styles.sectionSubtitle}>
            Stay up to date with the latest competitions and events in the slacklining community.
          </p>
        </div>
        <CardGrid columns={NUM_FEATURED_EVENTS}>
          {featuredContestsData.map(contest => (
            <FeaturedContestCard key={contest.eventId} contest={contest} />
          ))}
        </CardGrid>
      </section>

      {/* Featured Athletes Section */}
      <FeaturedAthleteSection athletes={featuredAthletesData.slice(0, 3)} />
    </PageLayout>
  );
}
