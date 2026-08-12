import { DISCIPLINE_DATA, MAP_DISCIPLINE_ENUM_TO_NAME } from "@utils/consts";
import { ContestTabData } from "./ContestTabGroup";
import { AgeCategory, ContestSize, Gender } from "@ui/Badge";
import { ContestJudge, EventOrganizer } from "@lib/relational-types";
import Link from "next/link";

const KeyValuePair = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
  <div className="flex flex-col justify-between">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const NameLink = (user: (ContestJudge | EventOrganizer) & { isPending?: boolean; id?: string }) => {
  const id = user.id || user.userId || "";
  const { name, isPending } = user;

  if (isPending) {
    return (
      <span className="border-amber-300 bg-amber-50 text-amber-800 italic">
        {name} (Pending)
      </span>
    );
  }

  if (id) {
    return (
      <Link href={`/athlete/${id}`} className="text-blue-600 hover:underline">
        {name}
      </Link>
    );
  }

  return name;
};

export const ContestAbout = ({ contest }: { contest: ContestTabData }) => {
  const {
    ageCategory,
    contestSize,
    discipline,
    gender,
    judges = [],
    judgingSystem,
    organizers = [],
    prize
  } = contest;
  const disciplineKey = MAP_DISCIPLINE_ENUM_TO_NAME[Number(discipline)];
  const { name: disciplineName } = DISCIPLINE_DATA[disciplineKey];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-8">
        <KeyValuePair label="Discipline" value={disciplineName} />
        <KeyValuePair label="Gender" value={<Gender variant={(gender || "") as ContestGender} />} />
        <KeyValuePair label="Age Category" value={<AgeCategory variant={(ageCategory || "") as AgeCategory} />} />
        <KeyValuePair label="Contest Size" value={<ContestSize variant={(contestSize || "") as ContestType} />} />
        <KeyValuePair label="Total Prize Value" value={prize ? `${prize} Euro` : "N/A"} />
        <KeyValuePair label="Judging System" value={judgingSystem || "Not Available"} />
      </div>
      <KeyValuePair label="Judges" value={judges.map(NameLink)} />
      <KeyValuePair label="Organizers" value={organizers.map(NameLink)} />
    </div>
  );
};
