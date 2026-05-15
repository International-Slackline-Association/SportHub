'use client';

import { Fragment, useState, useCallback, useRef } from 'react';
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

/**
 * Renders the hero image + discipline cards together as a client component,
 * so hovering a discipline card crossfades the hero to a matching photo.
 */
export function DisciplineHeroSection() {
  // A/B crossfade: two images stacked; we alternate which one is "on top".
  const activeSlotRef = useRef<'a' | 'b'>('a');
  const [heroImages, setHeroImages] = useState<{ a: HeroImage; b: HeroImage }>(() => {
    const initial = randomS3Image();
    return { a: initial, b: initial };
  });
  const [topSlot, setTopSlot] = useState<'a' | 'b'>('a');

  const transitionTo = useCallback((heroImage: HeroImage) => {
    const nextSlot = activeSlotRef.current === 'a' ? 'b' : 'a';

    // Preload src into the hidden slot, then fade it in
    setHeroImages(prev => ({ ...prev, [nextSlot]: heroImage }));

    requestAnimationFrame(() => {
      activeSlotRef.current = nextSlot;
      setTopSlot(nextSlot);
    });
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
        }}
      >
        {(['a', 'b'] as const).map(slot => (
          <Fragment key={slot}>
            {heroImages[slot].blurredBackground && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: topSlot === slot ? 1 : 0,
                  transition: 'opacity 0.5s ease',
                  zIndex: topSlot === slot ? 0 : -1,
                  overflow: 'hidden',
                }}
              >
                <Image
                  src={heroImages[slot].src}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={slot === 'a'}
                  style={{
                    objectFit: 'cover',
                    objectPosition: heroImages[slot].objectPosition ?? 'center',
                    filter: 'blur(18px)',
                    transform: `scale(${heroImages[slot].backgroundZoom ?? 1})`,
                  }}
                />
              </div>
            )}
            <Image
              src={heroImages[slot].src}
              alt={heroImages[slot].alt}
              fill
              sizes="100vw"
              priority={slot === 'a'}
              style={{
                objectFit: heroImages[slot].blurredBackground ? 'contain' : 'cover',
                objectPosition: heroImages[slot].objectPosition ?? 'center',
                opacity: topSlot === slot ? 1 : 0,
                transition: 'opacity 0.5s ease',
                zIndex: topSlot === slot ? 1 : 0,
              }}
            />
          </Fragment>
        ))}
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
