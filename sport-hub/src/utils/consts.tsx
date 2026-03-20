import {
  FreestyleHighlineIcon,
  RiggingIcon,
  SpeedHighlineIcon,
  SpeedShortIcon,
  FreestyleTricklineIcon,
} from "@ui/Icons";
import { JSX } from "react";

export const S3_IMAGES = {
  hero: 'https://images.isa-rankings.org/public/sporthub/hero.jpg',
  events: 'https://images.isa-rankings.org/public/sporthub/events_hero.jpg',
  rankings: 'https://images.isa-rankings.org/public/sporthub/freestyle_hero.jpg',
  judging: 'https://images.isa-rankings.org/public/sporthub/judging_hero.jpg',
  worldRecords: 'https://images.isa-rankings.org/public/sporthub/world_record_hero.jpg',
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
  OVERALL: {
    enumValue: 0,
    name: 'Overall',
    description: 'Combined overall ranking',
    Icon: (iconProps: IconProps) => <FreestyleHighlineIcon {...iconProps} />
  },
  TRICKLINE: {
    enumValue: 1,
    name: 'Trickline',
    description: 'Dynamic tricks and flips',
    Icon: (iconProps: IconProps) => <FreestyleTricklineIcon {...iconProps} />
  },
  TRICKLINE_AERIAL: {
    enumValue: 2,
    name: 'Trickline Aerial',
    description: 'Aerial trickline maneuvers',
    Icon: (iconProps: IconProps) => <FreestyleTricklineIcon {...iconProps} />
  },
  TRICKLINE_JIB_AND_STATIC: {
    enumValue: 3,
    name: 'Trickline Jib & Static',
    description: 'Jib and static trickline tricks',
    Icon: (iconProps: IconProps) => <FreestyleTricklineIcon {...iconProps} />
  },
  TRICKLINE_TRANSFER: {
    enumValue: 4,
    name: 'Trickline Transfer',
    description: 'Trickline transfer tricks',
    Icon: (iconProps: IconProps) => <FreestyleTricklineIcon {...iconProps} />
  },
  FREESTYLE_HIGHLINE: {
    enumValue: 5,
    name: 'Freestyle Highline',
    description: 'Artistic expression on the highline',
    Icon: (iconProps: IconProps) => <FreestyleHighlineIcon {...iconProps} />
  },
  SPEED: {
    enumValue: 6,
    name: 'Speed',
    description: 'Speed competitions',
    Icon: (iconProps: IconProps) => <SpeedShortIcon {...iconProps} />
  },
  SPEED_SHORT: {
    enumValue: 7,
    name: 'Speedline Short',
    description: 'Sprint competitions',
    Icon: (iconProps: IconProps) => <SpeedShortIcon {...iconProps} />
  },
  SPEED_HIGHLINE: {
    enumValue: 8,
    name: 'Speedline Highline',
    description: 'Racing on exposed heights',
    Icon: (iconProps: IconProps) => <SpeedHighlineIcon {...iconProps} />
  },
  ENDURANCE: {
    enumValue: 9,
    name: 'Endurance',
    description: 'Long-distance balance challenge',
    Icon: (iconProps: IconProps) => <SpeedHighlineIcon {...iconProps} />
  },
  BLIND: {
    enumValue: 10,
    name: 'Blind',
    description: 'Blindfolded slackline walking',
    Icon: (iconProps: IconProps) => <FreestyleHighlineIcon {...iconProps} />
  },
  RIGGING: {
    enumValue: 11,
    name: 'Rigging',
    description: 'Technical setup mastery',
    Icon: (iconProps: IconProps) => <RiggingIcon {...iconProps} />
  },
  FREESTYLE: {
    enumValue: 12,
    name: 'Freestyle',
    description: 'Freestyle slackline tricks',
    Icon: (iconProps: IconProps) => <FreestyleHighlineIcon {...iconProps} />
  },
  WALKING: {
    enumValue: 13,
    name: 'Walking',
    description: 'Slackline walking',
    Icon: (iconProps: IconProps) => <SpeedHighlineIcon {...iconProps} />
  },
};

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

export const MAP_GENDER_ENUM_TO_NAME: Record<number, Gender> = {
  0: "ALL",
  1: "MEN",
  2: "WOMEN",
  3: "OTHER",
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
