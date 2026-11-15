import {
  FreestyleHighlineIcon,
  RiggingIcon,
  SpeedHighlineIcon,
  SpeedShortIcon,
  FreestyleTricklineIcon,
} from "@ui/Icons";
import { JSX } from "react";
import { DISCIPLINE_ENUM_VALUES } from "./discipline-enum-values";


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
  OVERALL: {
    enumValue: DISCIPLINE_ENUM_VALUES.OVERALL,
    name: 'All Disciplines',
    description: 'Combined overall ranking',
    Icon: () => <></>
  },
  TRICKLINE: {
    enumValue: DISCIPLINE_ENUM_VALUES.TRICKLINE,
    name: 'Trickline',
    description: 'Dynamic tricks and flips',
    Icon: (iconProps: IconProps) => <FreestyleTricklineIcon {...iconProps} />
  },
  // TODO: Confirm with Tom how to handle Trickline sub-disciplines. Currently we only have records for trickline aerial.
  TRICKLINE_AERIAL: {
    enumValue: DISCIPLINE_ENUM_VALUES.TRICKLINE_AERIAL,
    name: 'Trickline',
    // name: 'Trickline Aerial',
    description: 'Dynamic tricks and flips',
    // description: 'Aerial trickline maneuvers',
    Icon: (iconProps: IconProps) => <FreestyleTricklineIcon {...iconProps} />
  },
  TRICKLINE_JIB_AND_STATIC: {
    enumValue: DISCIPLINE_ENUM_VALUES.TRICKLINE_JIB_AND_STATIC,
    name: 'Trickline Jib & Static',
    description: 'Jib and static trickline tricks',
    Icon: (iconProps: IconProps) => <FreestyleTricklineIcon {...iconProps} />
  },
  TRICKLINE_TRANSFER: {
    enumValue: DISCIPLINE_ENUM_VALUES.TRICKLINE_TRANSFER,
    name: 'Trickline Transfer',
    description: 'Trickline transfer tricks',
    Icon: (iconProps: IconProps) => <FreestyleTricklineIcon {...iconProps} />
  },
  FREESTYLE_HIGHLINE: {
    enumValue: DISCIPLINE_ENUM_VALUES.FREESTYLE_HIGHLINE,
    name: 'Freestyle Highline',
    description: 'Artistic expression on the highline',
    Icon: (iconProps: IconProps) => <FreestyleHighlineIcon {...iconProps} />
  },
  SPEED: {
    enumValue: DISCIPLINE_ENUM_VALUES.SPEED,
    name: 'Speed',
    description: 'Speed competitions',
    Icon: (iconProps: IconProps) => <SpeedShortIcon {...iconProps} />
  },
  SPEED_SHORT: {
    enumValue: DISCIPLINE_ENUM_VALUES.SPEED_SHORT,
    name: 'Speedline Short',
    description: 'Racing over ground',
    Icon: (iconProps: IconProps) => <SpeedShortIcon {...iconProps} />
  },
  SPEED_HIGHLINE: {
    enumValue: DISCIPLINE_ENUM_VALUES.SPEED_HIGHLINE,
    name: 'Speed Highline',
    description: 'Racing at height',
    Icon: (iconProps: IconProps) => <SpeedHighlineIcon {...iconProps} />
  },
  ENDURANCE: {
    enumValue: DISCIPLINE_ENUM_VALUES.ENDURANCE,
    name: 'Endurance',
    description: 'Long-distance balance challenge',
    Icon: (iconProps: IconProps) => <SpeedHighlineIcon {...iconProps} />
  },
  BLIND: {
    enumValue: DISCIPLINE_ENUM_VALUES.BLIND,
    name: 'Blind',
    description: 'Blindfolded slackline walking',
    Icon: (iconProps: IconProps) => <FreestyleHighlineIcon {...iconProps} />
  },
  RIGGING: {
    enumValue: DISCIPLINE_ENUM_VALUES.RIGGING,
    name: 'Rigging',
    description: 'Technical setup mastery',
    Icon: (iconProps: IconProps) => <RiggingIcon {...iconProps} />
  },
  FREESTYLE: {
    enumValue: DISCIPLINE_ENUM_VALUES.FREESTYLE,
    name: 'Freestyle',
    description: 'Freestyle slackline tricks',
    Icon: (iconProps: IconProps) => <FreestyleHighlineIcon {...iconProps} />
  },
  WALKING: {
    enumValue: DISCIPLINE_ENUM_VALUES.WALKING,
    name: 'Walking',
    description: 'Slackline walking',
    Icon: (iconProps: IconProps) => <SpeedHighlineIcon {...iconProps} />
  },
};

// More disciplines in our DB, these are what's accessible for users
export const SUPPORTED_DISCIPLINES: Discipline[] = [
  'TRICKLINE_AERIAL',
  'FREESTYLE_HIGHLINE',
  'SPEED_SHORT',
  'SPEED_HIGHLINE',
  'RIGGING',
];

export const MAP_DISCIPLINE_ENUM_TO_NAME: Record<number, Discipline> = {
  0: "OVERALL",
  1: "TRICKLINE",
  2: "TRICKLINE_AERIAL",
  3: "TRICKLINE_JIB_AND_STATIC",
  4: "TRICKLINE_TRANSFER",
  5: "FREESTYLE_HIGHLINE",
  6: "SPEED",
  7: "SPEED_SHORT",
  8: "SPEED_HIGHLINE",
  9: "ENDURANCE",
  10: "BLIND",
  11: "RIGGING",
  12: "FREESTYLE",
  13: "WALKING",
};

export const MAP_AGE_CATEGORY_ENUM_TO_NAME: Record<number, AgeCategory> = {
  0: "ALL",
  1: "YOUTH",
  2: "SENIOR",
};

export const MAP_RANKING_TYPE_ENUM_TO_NAME: Record<number, RankingType> = {
  1: "TOP_SCORE",
  2: "POINT_SCORE",
};

export const MAP_CONTEST_TYPE_ENUM_TO_NAME: Record<number, ContestType> = {
  0: "WORLD_CHAMPIONSHIP",
  1: "WORLD_CUP",
  2: "MASTERS",
  3: "GRAND_SLAM",
  4: "OPEN",
  5: "CHALLENGE",
};

export const MAP_CONTEST_GENDER_ENUM_TO_NAME: Record<number, ContestGender> = {
  0: "MIXED",
  1: "MEN_ONLY",
  2: "WOMEN_ONLY",
};
