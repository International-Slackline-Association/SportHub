import { PropsWithChildren } from 'react';
import Image from 'next/image';
import { Hero, PageTitle } from '@slacklineinternational/onsight/react';
import type { HeroImage } from '@utils/images';

export type PageLayoutProps = PropsWithChildren<{
  title?: string;
  description?: string | React.ReactNode;
  heroImage?: HeroImage;
}>;

const heroCaption = (hero: HeroImage) => {
  if (hero.caption) return hero.caption;
  if (hero.credit) return `Photo: ${hero.credit}`;
  return undefined;
};

/**
 * Title, optional photo, then the page sections. Width and padding come from
 * the Onsight main in the root layout.
 */
export const PageLayout = ({ children, title, description, heroImage }: PageLayoutProps) => {
  return (
    <>
      {(title || description) && (
        <PageTitle title={title || ''}>{description}</PageTitle>
      )}
      {heroImage && (
        <Hero
          alt={heroImage.alt}
          caption={heroCaption(heroImage)}
          contain={Boolean(heroImage.blurredBackground)}
          imgAs={Image}
          imgProps={{
            height: 640,
            priority: true,
            sizes: '100vw',
            style: { objectPosition: heroImage.objectPosition ?? 'center' },
            width: 1600,
          }}
          src={heroImage.src}
        />
      )}
      {children}
    </>
  );
};

export default PageLayout;
