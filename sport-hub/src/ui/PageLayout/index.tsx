import { PropsWithChildren } from "react";
import Image from "next/image";
import styles from "./styles.module.css";
import { cn } from "@utils/cn";

export type PageLayoutProps = PropsWithChildren<{
  title?: string;
  description?: string;
  heroImage?: {
    src: string;
    alt: string;
    caption?: string;
    blurredBackground?: boolean;
    objectPosition?: string;
  };
  overlayText?: boolean;
}>;

/**
 * Standardized page layout component for consistent width and spacing across all pages.
 *
 * Usage:
 * <PageLayout title="Page Title" description="Page description">
 *   <section className="p-4 sm:p-0">
 *     // Your content sections here
 *   </section>
 * </PageLayout>
 *
 * Each content section should use className="p-4 sm:p-0" for consistent responsive padding.
 */
export const PageLayout = ({ children, title, description, heroImage, overlayText=false }: PageLayoutProps) => {
  return (
    <div className="stack gap-4 flex-1 min-h-0">
      {(title || description) && (
        <section className={cn(styles.pageHeader, overlayText && styles.overlayTextOnImage)}>
          {title && <h1>{title}</h1>}
          {description && <p>{description}</p>}
        </section>
      )}

      {heroImage && (
        <>
          <figure className={styles.heroFigure}>
            {heroImage.blurredBackground && (
              <div className={styles.heroBackgroundWrapper} aria-hidden="true">
                <Image
                  src={heroImage.src}
                  alt=""
                  fill
                  sizes="100vw"
                  className={styles.heroBackgroundImage}
                  priority
                />
              </div>
            )}
            <Image
              src={heroImage.src}
              alt={heroImage.alt}
              fill
              sizes="100vw"
              className={styles.heroForegroundImage}
              style={{
                objectPosition: heroImage.objectPosition ?? 'center',
                objectFit: heroImage.blurredBackground ? 'contain' : 'cover'
              }}
              priority
            />
          </figure>
          {heroImage.caption && <figcaption>{heroImage.caption}</figcaption>}
        </>
      )}

      {children}
    </div>
  );
};

export default PageLayout;