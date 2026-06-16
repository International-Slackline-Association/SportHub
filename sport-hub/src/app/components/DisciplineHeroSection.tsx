'use client';

import { Fragment, useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { CardGrid } from '@ui/Card';
import { StackedMediaCard } from '@ui/StackedMediaCard';
import { DISCIPLINE_DATA } from '@utils/consts';
import { S3_IMAGES, randomS3Image, type HeroImage } from '@utils/images';
import styles from '../page.module.css';

type DisciplineKey = 'FREESTYLE_HIGHLINE' | 'TRICKLINE' | 'SPEED_HIGHLINE' | 'SPEED_SHORT' | 'RIGGING';

const DISCIPLINES: DisciplineKey[] = [
  'FREESTYLE_HIGHLINE',
  'TRICKLINE',
  'SPEED_HIGHLINE',
  'SPEED_SHORT',
  'RIGGING',
];

const defaultHeroImage = S3_IMAGES.WORLD_RECORDS[0];

type HeroImageLayerProps = {
  hero: HeroImage;
  opacity: number;
  zIndex: number;
  priority?: boolean;
};

function HeroImage({ hero, opacity, zIndex, priority = false }: HeroImageLayerProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        transition: 'opacity 0.5s ease',
        zIndex,
        overflow: 'hidden',
        backgroundColor: '#fff',
        pointerEvents: 'none',
      }}
    >
      {hero.blurredBackground && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
          }}
        >
          <Image
            src={hero.src}
            alt=""
            fill
            sizes="100vw"
            priority={priority}
            style={{
              objectFit: 'cover',
              objectPosition: hero.objectPosition ?? 'center',
              filter: 'blur(24px)',
            }}
          />
        </div>
      )}
      <Image
        suppressHydrationWarning
        src={hero.src}
        alt={hero.alt}
        fill
        sizes="100vw"
        priority={priority}
        style={{
          objectFit: hero.blurredBackground ? 'contain' : 'cover',
          objectPosition: hero.objectPosition ?? 'center',
        }}
      />
    </div>
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

  const handleMouseEnter = useCallback((discipline: DisciplineKey) => {
    const pool = S3_IMAGES[discipline];
    transitionTo(pool[Math.floor(Math.random() * pool.length)]);
  }, [transitionTo]);

  return (
    <>
      {/* Hero figure — same dimensions as PageLayout's heroFigure */}
      <figure
        style={{
          height: '40vw',
          margin: 0,
          maxHeight: 520,
          minHeight: 200,
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
          backgroundColor: '#000',
        }}
      >
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
      </figure>

      {/* Rankings / Disciplines Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Rankings</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:hidden">
          {DISCIPLINES.map(discipline => {
            const { name, description, Icon, enumValue } = DISCIPLINE_DATA[discipline];
            return (
              <div
                key={discipline}
                className="min-w-64 shrink-0 snap-start"
                onMouseEnter={() => handleMouseEnter(discipline)}
              >
                <StackedMediaCard
                  href={`/rankings?discipline=${enumValue}`}
                  className="h-48"
                  media={<Icon />}
                  desktopDirection="vertical"
                  mobileDirection="vertical"
                  hoverable
                >
                  <span className="font-bold block">{name}</span>
                  <span className="font-normal text-sm">{description}</span>
                </StackedMediaCard>
              </div>
            );
          })}
        </div>

        <div className="hidden sm:block">
          <CardGrid columns={5}>
            {DISCIPLINES.map(discipline => {
              const { name, description, Icon, enumValue } = DISCIPLINE_DATA[discipline];
              return (
                <div
                  key={discipline}
                  onMouseEnter={() => handleMouseEnter(discipline)}
                >
                  <StackedMediaCard
                    href={`/rankings?discipline=${enumValue}`}
                    className="h-48"
                    media={<Icon />}
                    desktopDirection="vertical"
                    mobileDirection="vertical"
                    hoverable
                  >
                    <span className="font-bold block">{name}</span>
                    <span className="font-normal text-sm">{description}</span>
                  </StackedMediaCard>
                </div>
              );
            })}
          </CardGrid>
        </div>
      </section>
    </>
  );
}
