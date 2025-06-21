import { PropsWithChildren } from "react";
import styles from "./styles.module.css";

type FeaturedGridProps = PropsWithChildren<{
  title: string;
}>;

const FeaturedGrid = ({ children, title }: FeaturedGridProps) => (
  <section className="p-4 sm:p-0">
    <h3 className="mb-4">{title}</h3>
    <div className={styles.featuredGrid}>
      {children}
    </div>
  </section>
);

export { default as FeaturedCard } from "./FeaturedCard";
export default FeaturedGrid;
