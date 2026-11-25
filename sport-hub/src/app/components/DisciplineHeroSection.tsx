'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { S3_IMAGES, randomS3Image, type HeroImage } from '@utils/images';
import styles from '@ui/featuredSections.module.css';
import { FeaturedCardGrid } from '@ui/FeaturedCardGrid';
import DisciplineCard from './DisciplineCard';

const DISCIPLINES: Discipline[] = [
  'FREESTYLE_HIGHLINE',
  'TRICKLINE_AERIAL',
  'SPEED_HIGHLINE',
  'SPEED_SHORT',
  'RIGGING',
];

type HeroImageLayerProps = {
  hero: HeroImage;
  opacity: number;
  zIndex: number;
  priority?: boolean;
};

function HeroImage({ hero, opacity, zIndex, priority = false }: HeroImageLayerProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      fill
      priority={priority}
      sizes="100vw"
      src={hero.src}
      style={{
        objectFit: 'cover',
        objectPosition: hero.objectPosition ?? 'center',
        opacity,
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease',
        zIndex,
      }}
      suppressHydrationWarning
    />
  );
}

/**
 * Renders the hero image + discipline cards together as a client component,
 * so hovering a discipline card crossfades the hero to a matching photo.
 */
export function DisciplineHeroSection() {
  const transitionIdRef = useRef(0);
  const transitionTimeoutRef = useRef<number | null>(null);
  const [currentHero, setCurrentHero] = useState<HeroImage>(randomS3Image());
  const [nextHero, setNextHero] = useState<HeroImage | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const transitionTo = useCallback((heroImage: HeroImage) => {
    const transitionId = ++transitionIdRef.current;

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    setNextHero(null);
    setIsTransitioning(false);

    const preload = new window.Image();
    preload.onload = () => {
      if (transitionIdRef.current !== transitionId) return;

      setNextHero(heroImage);

      window.requestAnimationFrame(() => {
        if (transitionIdRef.current !== transitionId) return;

        setIsTransitioning(true);

        transitionTimeoutRef.current = window.setTimeout(() => {
          if (transitionIdRef.current !== transitionId) return;

          setCurrentHero(heroImage);
          setNextHero(null);
          setIsTransitioning(false);
          transitionTimeoutRef.current = null;
        }, 500);
      });
    };
    preload.onerror = () => {
      if (transitionIdRef.current !== transitionId) return;
      // Ignore preload failures and keep the current hero image.
    };
    preload.src = heroImage.src;
  }, []);

  const handleMouseEnter = useCallback((discipline: Discipline) => {
    let pool = S3_IMAGES[discipline];
    if (discipline == "TRICKLINE_AERIAL") {
      pool = S3_IMAGES.TRICKLINE;
    }
    transitionTo(pool[Math.floor(Math.random() * pool.length)]);
  }, [transitionTo]);

  return (
    <>
      {/* Onsight's Hero is one picture. This one crossfades when a discipline is hovered. */}
      <figure className="isa-hero">
        <div className="relative h-[40vw] min-h-[var(--isa-size-hero-min)] max-h-[var(--isa-size-hero-max)] overflow-hidden rounded-lg bg-muted">
          <HeroImage
            key={`current-hero-${currentHero.src}`}
            hero={currentHero}
            opacity={isTransitioning ? 0 : 1}
            zIndex={1}
            priority
          />
          {nextHero && (
            <HeroImage
              key={`next-hero-${nextHero.src}`}
              hero={nextHero}
              opacity={isTransitioning ? 1 : 0}
              zIndex={2}
              priority
            />
          )}
        </div>
        {currentHero?.credit && <figcaption>Photo: {currentHero.credit}</figcaption>}
      </figure>

      {/* Rankings / Disciplines Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Rankings</h2>
        <FeaturedCardGrid columns={5} itemMinWidth="min-w-64">
          {DISCIPLINES.map(discipline => (
            <DisciplineCard
              key={discipline}
              discipline={discipline}
              onMouseEnter={() => handleMouseEnter(discipline)}
            />
          ))}
        </FeaturedCardGrid>
      </section>
    </>
  );
}
