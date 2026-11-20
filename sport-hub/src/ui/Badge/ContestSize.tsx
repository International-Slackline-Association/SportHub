import { TrophyIcon } from "@ui/Icons";
import { snakeCaseToTitleCase } from "@utils/strings";
import { contestSizeOptions } from "@ui/Form/commonOptions";
import { MAP_CONTEST_TYPE_ENUM_TO_NAME } from "@utils/consts";
import { cn } from "@utils/cn";

const getContestSizeOption = (
  value: number | string | null | undefined,
): Option<ContestType> | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  let contestSize;
  if (Number.isInteger(value)) {
    contestSize = MAP_CONTEST_TYPE_ENUM_TO_NAME[value as number];
  } else {
    contestSize = String(value).trim().toUpperCase().replace(/\s+/g, "_");
  }

  return contestSizeOptions.find(({ value }) => value === contestSize);
};

const getContestSizeTrophyCount = (contestSize: ContestType) =>
  contestSizeOptions.findIndex(({ value }) => value === contestSize) + 1;

interface ContestSizeProps {
  className?: string;
  showIcon?: boolean;
  singleIcon?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "normal" | "bold" | "outline";
  value: ContestType | string | undefined;
}

const TROPHY_SIZES = { sm: 12, md: 16, lg: 20 };

const ContestSize = ({
  className,
  showIcon = true,
  size = "md",
  singleIcon = false,
  value,
}: ContestSizeProps) => {
  const contestSizeOption = getContestSizeOption(value);

  if (!contestSizeOption) {
    return null;
  }

  const numTrophies = singleIcon ? 1 : getContestSizeTrophyCount(contestSizeOption.value);

  return (
    <span className={cn("cluster items-center gap-2", className)}>
      {showIcon && numTrophies > 0 && (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {Array(numTrophies).fill("").map((_, idx) => (
            <TrophyIcon key={`trophy-${idx}`} size={TROPHY_SIZES[size]} />
          ))}
        </span>
      )}
      <span className="whitespace-nowrap">{snakeCaseToTitleCase(contestSizeOption.label)}</span>
    </span>
  );
};

export default ContestSize;
