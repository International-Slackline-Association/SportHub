"use client"

import { PropsWithChildren, useEffect, useRef, ReactElement, Children, useState } from "react";
import styles from "./styles.module.css";

type FeaturedGridProps = PropsWithChildren<{
  title: string;
}>;

const FeaturedGrid = ({ children, title }: FeaturedGridProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleChildren, setVisibleChildren] = useState<ReactElement[]>([]);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const childrenArray = Children.toArray(children) as ReactElement[];
    if (childrenArray.length === 0) return;

    const calculateVisibleChildren = () => {
      const containerWidth = scrollContainer.clientWidth;
      const cardWidth = 224 + 16; // 14rem (224px) + 1rem gap (16px) at base size
      const maxVisible = Math.floor(containerWidth / cardWidth);

      // If we can fit all children, just show them once
      if (maxVisible >= childrenArray.length) {
        setVisibleChildren(childrenArray);
        return;
      }

      // Otherwise, create enough duplicates for smooth infinite scroll
      const duplicatedChildren = [];
      for (let i = 0; i < maxVisible * 3; i++) {
        duplicatedChildren.push(childrenArray[i % childrenArray.length]);
      }
      setVisibleChildren(duplicatedChildren);
    };

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
      const cardWidth = 224 + 16;
      const maxVisible = Math.floor(clientWidth / cardWidth);

      // Only handle infinite scroll if we have duplicates
      if (maxVisible < childrenArray.length) {
        const sectionWidth = scrollWidth / 3;

        if (scrollLeft >= sectionWidth * 2) {
          scrollContainer.scrollLeft = scrollLeft - sectionWidth;
        } else if (scrollLeft <= 0) {
          scrollContainer.scrollLeft = sectionWidth;
        }
      }
    };

    calculateVisibleChildren();
    scrollContainer.addEventListener('scroll', handleScroll);

    // Initialize scroll position for infinite scroll
    const initializePosition = () => {
      const containerWidth = scrollContainer.clientWidth;
      const cardWidth = 224 + 16;
      const maxVisible = Math.floor(containerWidth / cardWidth);

      if (maxVisible < childrenArray.length) {
        const sectionWidth = scrollContainer.scrollWidth / 3;
        if (sectionWidth > 0) {
          scrollContainer.scrollLeft = sectionWidth;
        }
      }
    };

    requestAnimationFrame(initializePosition);

    // Recalculate on resize
    const handleResize = () => {
      calculateVisibleChildren();
      requestAnimationFrame(initializePosition);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [children]);

  return (
    <section className="p-4 sm:p-0">
      <h3 className="mb-4">{title}</h3>
      <div ref={scrollRef} className={styles.featuredGrid}>
        {visibleChildren}
      </div>
    </section>
  );
};

export { default as FeaturedCard } from "./FeaturedCard";
export default FeaturedGrid;
