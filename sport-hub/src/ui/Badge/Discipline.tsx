import { Badge, type BadgeCategoryColor } from "@slacklineinternational/onsight/react";
import { DISCIPLINE_DATA, MAP_DISCIPLINE_ENUM_TO_NAME } from "@utils/consts";

const disciplineColor: Partial<Record<Discipline, BadgeCategoryColor>> = {
  TRICKLINE: "red",
  TRICKLINE_AERIAL: "red",
  TRICKLINE_JIB_AND_STATIC: "red",
  TRICKLINE_TRANSFER: "red",
  FREESTYLE: "yellow",
  FREESTYLE_HIGHLINE: "yellow",
  SPEED: "green",
  SPEED_SHORT: "green",
  SPEED_HIGHLINE: "blue",
  RIGGING: "violet",
};

interface DisciplineProps {
  variant: string;
  className?: string;
}

const Discipline = ({ variant, className }: DisciplineProps) => {
  const key = Number.isInteger(Number(variant))
    ? MAP_DISCIPLINE_ENUM_TO_NAME[Number(variant)] || variant
    : variant;
  const name = DISCIPLINE_DATA[key as Discipline]?.name ?? key;

  return (
    <Badge color={disciplineColor[key as Discipline] ?? "neutral"} className={className}>
      {name}
    </Badge>
  );
};

export default Discipline;
