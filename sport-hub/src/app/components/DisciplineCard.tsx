import {
  FreestyleHighlineIcon,
  RiggingIcon,
  SpeedHighlineIcon,
  SpeedShortIcon,
  FreestyleTricklineIcon,
} from "@ui/Icons";
import { StackedMediaCard } from '@ui/StackedMediaCard';

// Disciplines data for rankings section
export const disciplinesData = {
  FREESTYLE_HIGHLINE: {
    name: 'Freestyle Highline',
    description: 'Artistic expression on the highline',
    icon: <FreestyleHighlineIcon />
  },
  TRICKLINE: {
    name: 'Trickline',
    description: 'Dynamic tricks and flips',
    icon: <FreestyleTricklineIcon />
  },
  SPEED_HIGHLINE: {
    name: 'Speed Highline',
    description: 'Racing on exposed heights',
    icon: <SpeedHighlineIcon />
  },
  SPEED_SHORT: {
    name: 'Speed Short',
    description: 'Sprint competitions',
    icon: <SpeedShortIcon />
  },
  RIGGING: {
    name: 'Rigging',
    description: 'Technical setup mastery',
    icon: <RiggingIcon />
  },
};

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
  const { name, description, icon } = disciplinesData[discipline];
  return (
    <StackedMediaCard
      // TODO: Link to rankings disciplines pages when ready
      // href="www.google.com"
      className="h-48"
      media={icon}
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
