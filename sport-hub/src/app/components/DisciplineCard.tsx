import { StackedMediaCard } from '@ui/StackedMediaCard';
import { DISCIPLINE_DATA } from '@utils/consts';

interface DisciplineCardProps {
  discipline: Discipline;
}

/**
 * DisciplineCard component for displaying slackline disciplines
 * Uses generic Card component with content-only layout
 */
const DisciplineCard = ({
  discipline,
}: DisciplineCardProps) => {
  const { name, description, Icon } = DISCIPLINE_DATA[discipline];
  return (
    <StackedMediaCard
      // TODO: Link to rankings disciplines pages when ready
      // href="www.google.com"
      className="h-48"
      media={<Icon />}
      desktopDirection="vertical"
      mobileDirection="horizontal"
      hoverable
    >
      <span className="font-bold block">{name}</span>
      <span className="font-normal text-sm">{description}</span>
    </StackedMediaCard>
  );
};

export default DisciplineCard;
