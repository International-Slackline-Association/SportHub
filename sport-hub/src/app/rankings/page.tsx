import type { Metadata } from 'next'
import Image from 'next/image'
import FeaturedCard from '@ui/FeaturedCard'
import { mockFeaturedAthletes } from '@mocks/rankings_data'
import styles from './styles.module.css'
import RankingsTable from './components/RankingsTable'

export const metadata: Metadata = {
  title: 'SportHub - Rankings',
}

export default async function Page() {
  return (
    <main className="stack gap-4">
      <div className="p-4 sm:p-0">
        <h1>Rankings</h1>
        <p>View the latest athlete rankings across all disciplines.</p>
      </div>
      <figure>
        <div className={styles.heroImage}>
          <Image 
            src="/static/images/hero-freestyle.png" 
            alt="Highline World Championship" 
            fill
            className={styles.image}
            />
        </div>
        <figcaption>Laax Highline World Championship, 2024</figcaption>
      </figure>

      <div>
        <h3 className="mb-4">Featured Athletes</h3>
        <div className={styles.featuredGrid}>
          {mockFeaturedAthletes.map(athlete => (
            <FeaturedCard
              key={athlete.athleteId}
              id={athlete.athleteId}
              name={athlete.fullName || `${athlete.name} ${athlete.surname}`}
              image={athlete.profileImage || '/static/images/profiles/default.jpg'}
              country={athlete.country}
              countryFlag={`/static/images/flags/${athlete.country.toLowerCase()}.svg`}
              disciplines={athlete.disciplines}
            />
          ))}
        </div>
      </div>
      <section>
        <RankingsTable />
      </section>
    </main>
  )
}