import { MAP_DISCIPLINE_ENUM_TO_NAME } from "@utils/consts";
import { ContestTabData } from "./ContestTabGroup";
import { AgeCategory, ContestSize, Discipline, Gender } from "@ui/Badge";
import { ContestJudge, EventOrganizer } from "@lib/relational-types";
import Link from "next/link";
import { LabelValuePair } from "@ui/LabelValuePair";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-8">
        <LabelValuePair label="Discipline" value={<Discipline variant={disciplineKey} />} />
        <LabelValuePair label="Gender" value={<Gender variant={(gender || "") as ContestGender} />} />
        <LabelValuePair label="Age Category" value={<AgeCategory variant={(ageCategory || "") as AgeCategory} />} />
        <LabelValuePair label="Contest Size" value={<ContestSize variant={(contestSize || "") as ContestType} />} />
        <LabelValuePair label="Total Prize Value" value={prize ? `${prize} Euro` : "N/A"} />
        <LabelValuePair label="Judging System" value={judgingSystem || "Not Available"} />
      </div>
      <LabelValuePair label="Judges" value={judges.map(NameLink)} />
      <LabelValuePair label="Organizers" value={organizers.map(NameLink)} />
    </div>
  );
};
