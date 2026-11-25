import { StackedMediaCard } from '@ui/StackedMediaCard';
import { DISCIPLINE_DATA } from '@utils/consts';
import styles from './styles.module.css';
import Link from 'next/link';

interface DisciplineCardProps {
  discipline: Discipline;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
}

/**
 * DisciplineCard component for displaying slackline disciplines
 * Uses generic Card component with content-only layout
 */
const DisciplineCard = ({
  discipline,
  onMouseEnter,
  onMouseLeave,
}: DisciplineCardProps) => {
  const { name, description, Icon } = DISCIPLINE_DATA[discipline];

  return (
    <StackedMediaCard
      className={`h-54 overflow-hidden bg-subtle border-border-default ${styles.disciplineCard}`}
      desktopDirection="vertical"
      hoverable
      media={<span className={styles.disciplineIcon}><Icon /></span>}
      mobileDirection="vertical"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      padding="p-0"
    >
      <div className="flex h-full w-full flex-col justify-between">
        <div className="py-3">
          <span className={styles.disciplineName}>{name}</span>
          <span className={styles.disciplineDescription}>{description}</span>
        </div>
        <div className={styles.disciplineActionRow}>
          <Link
            className={`${styles.disciplineActionButton} ${styles.disciplineActionButtonPrimary}`}
            href={`/rankings?discipline=${discipline}&gender=MEN`}
          >
            Men
          </Link>
          <Link
            className={`${styles.disciplineActionButton} ${styles.disciplineActionButtonSecondary}`}
            href={`/rankings?discipline=${discipline}&gender=WOMEN`}
          >
            Women
          </Link>
        </div>
      </div>
    </StackedMediaCard>
  );
};

export default DisciplineCard;
