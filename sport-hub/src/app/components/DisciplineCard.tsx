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
      className="h-54 overflow-hidden"
      desktopDirection="vertical"
      hoverable
      media={<Icon />}
      mobileDirection="vertical"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      padding="p-0"
    >
      <div className="flex h-full w-full flex-col justify-between">
        <div className="py-3">
          <span className="font-bold block">{name}</span>
          <span className="font-normal text-sm">{description}</span>
        </div>
        <div className={styles.actionRow}>
          <Link
            className={styles.actionButtonPrimary}
            href={`/rankings?discipline=${discipline}&gender=MEN`}
          >
            Men
          </Link>
          <Link
            className={styles.actionButtonSecondary}
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
