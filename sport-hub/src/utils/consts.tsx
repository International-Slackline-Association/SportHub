import {
  FreestyleHighlineIcon,
  RiggingIcon,
  SpeedHighlineIcon,
  SpeedShortIcon,
  FreestyleTricklineIcon,
} from "@ui/Icons";
import { JSX } from "react";

export const FIGMA_IMAGES = {
  hero: 'https://www.figma.com/api/mcp/asset/6ffdb54c-ba76-4da3-a54c-df4463e95d8c',
  athleteProfile: 'https://www.figma.com/api/mcp/asset/db33d03b-9b23-45ec-af6e-f6413751837c',
  athleteProfile2: 'https://www.figma.com/api/mcp/asset/40f35d01-6ad3-472a-9bfd-d7c1eed289f3',
  contestCard: 'https://www.figma.com/api/mcp/asset/5c75da93-6bc2-4c9a-896f-e38ab8ed377e',
  worldRecords: 'https://www.figma.com/api/mcp/asset/f536b78d-0e32-4be1-b31e-5f039dba9b40',
  worldFirsts: 'https://www.figma.com/api/mcp/asset/2789f159-4c8b-4192-8daa-e822920dfd77',
  registerContest: 'https://www.figma.com/api/mcp/asset/cca97462-795e-44fc-8e7a-a382cab72bdd',
  registerRecords: 'https://www.figma.com/api/mcp/asset/0754b313-c19e-43a6-b0c4-40c722e81715',
  registerFirsts: 'https://www.figma.com/api/mcp/asset/dc7e12a5-1788-4bc9-893b-def3122b69bc',
  registerAthletes: 'https://www.figma.com/api/mcp/asset/cd5a2901-8e49-4e72-a7a4-104b8a057333',
  learnContestSize: 'https://www.figma.com/api/mcp/asset/650439cf-64cb-4ec1-bfc1-5a161c347c03',
  learnScoring: 'https://www.figma.com/api/mcp/asset/4b072d35-e49d-4dc9-b285-02712a519c23',
  learnDisciplines: 'https://www.figma.com/api/mcp/asset/62ab079c-e3a7-4f6f-b5b0-eb1ebc62254c',
};

type IconProps = {
  height?: number;
  width?: number;
}

type DisciplineUIData = {
  description: string;
  enumValue: number;
  Icon: (iconProps: IconProps) => JSX.Element
  name: string;
};

export const DISCIPLINE_DATA: Record<Discipline, DisciplineUIData> = {
  FREESTYLE_HIGHLINE: {
    enumValue: 5,
    name: 'Freestyle Highline',
    description: 'Artistic expression on the highline',
    Icon: (iconProps: IconProps) => <FreestyleHighlineIcon {...iconProps} />
  },
  TRICKLINE: {
    enumValue: 2,
    name: 'Trickline',
    description: 'Dynamic tricks and flips',
    Icon: (iconProps: IconProps) => <FreestyleTricklineIcon {...iconProps} />
  },
  SPEED_HIGHLINE: {
    enumValue: 8,
    name: 'Speed Highline',
    description: 'Racing on exposed heights',
    Icon: (iconProps: IconProps) => <SpeedHighlineIcon {...iconProps} />
  },
  SPEED_SHORT: {
    enumValue: 7,
    name: 'Speed Short',
    description: 'Sprint competitions',
    Icon: (iconProps: IconProps) => <SpeedShortIcon {...iconProps} />
  },
  RIGGING: {
    enumValue: 11,
    name: 'Rigging',
    description: 'Technical setup mastery',
    Icon: (iconProps: IconProps) => <RiggingIcon {...iconProps} />
  },
};

export const MAP_DISCIPLINE_ENUM_TO_NAME: Record<number, Discipline> = {
  2: "TRICKLINE",
  5: "FREESTYLE_HIGHLINE",
  7: "SPEED_SHORT",
  8: "SPEED_HIGHLINE",
  11: "RIGGING",
};
