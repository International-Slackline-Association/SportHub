'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { CardGrid } from '@ui/Card';
import { StackedMediaCard } from '@ui/StackedMediaCard';
import { S3_IMAGES, DISCIPLINE_DATA, randomS3Image } from '@utils/consts';
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
  const [srcs, setSrcs] = useState<{ a: string; b: string }>(() => {
    const initial = randomS3Image();
    return { a: initial, b: initial };
  });
  const [topSlot, setTopSlot] = useState<'a' | 'b'>('a');

  const transitionTo = useCallback((src: string) => {
    const nextSlot = activeSlotRef.current === 'a' ? 'b' : 'a';

    // Preload src into the hidden slot, then fade it in
    setSrcs(prev => ({ ...prev, [nextSlot]: src }));

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
          <Image
            key={slot}
            src={srcs[slot]}
            alt="Slackline discipline hero"
            fill
            sizes="100vw"
            priority={slot === 'a'}
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
              opacity: topSlot === slot ? 1 : 0,
              transition: 'opacity 0.5s ease',
              zIndex: topSlot === slot ? 1 : 0,
            }}
          />
        ))}
      </figure>

      {/* Rankings / Disciplines Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Rankings</h2>
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
                  mobileDirection="horizontal"
                  hoverable
                >
                  <span className="font-bold block">{name}</span>
                  <span className="font-normal text-sm">{description}</span>
                </StackedMediaCard>
              </div>
            );
          })}
        </CardGrid>
      </section>
    </>
  );
}
