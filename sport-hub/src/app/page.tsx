export const dynamic = 'force-dynamic';

import PageLayout from '@ui/PageLayout';
import DisciplineCard from './components/DisciplineCard';
import { FeaturedAthleteSection } from '@ui/FeaturedAthleteCard';
import FeaturedContestCard from './components/FeaturedContestCard';
import { CardGrid } from '@ui/Card';
import styles from './page.module.css';
import { S3_IMAGES } from '@utils/consts';
import { getContestsData, getFeaturedAthletes } from '@lib/data-services';


const NUM_FEATURED_EVENTS = 3;
const NUM_FEATURED_ATHLETES = 3;

const getFeaturedEvents = async () => {
  const allEvents = await getContestsData();

  return allEvents
    // TODO: Check with Tom on actual criteria
    // .filter(event => {
    //     const eventDate = new Date(event.date);
    //     const isValidDate = !isNaN(eventDate.getTime());
    //     const isLessThanTwoYearsAgo = isValidDate && (new Date().getTime() - eventDate.getTime()) < (2 * 365 * 24 * 60 * 60 * 1000);
    //     return isLessThanTwoYearsAgo;
    //   })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, NUM_FEATURED_EVENTS);
};

export default async function Home() {
  const featuredContestsData = await getFeaturedEvents();
  const featuredAthletesData = await getFeaturedAthletes(undefined, NUM_FEATURED_ATHLETES);

  return (
    <PageLayout
      title="Slackline Sport Hub"
      description="Your destination for athlete rankings, events, and world records."
      heroImage={{
        src: S3_IMAGES.hero,
        alt: 'Laax Highline World Championship',
        caption: 'Laax Highline World Championship, 2024',
        blurredBackground: true
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
          <h2 className={styles.sectionTitle}>Featured Contests</h2>
          <p className={styles.sectionSubtitle}>
            Stay up to date with the latest competitions and events in the slacklining community.
          </p>
        </div>
        <CardGrid columns={NUM_FEATURED_EVENTS}>
          {featuredContestsData.map(contest => (
            <FeaturedContestCard key={contest.contestId || `${contest.eventId}-${contest.discipline}-${contest.gender}`} contest={contest} />
          ))}
        </CardGrid>
      </section>

      {/* Featured Athletes Section */}
      <FeaturedAthleteSection athletes={featuredAthletesData.slice(0, 3)} />
    </PageLayout>
  );
}
