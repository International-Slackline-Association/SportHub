import { EmptyState } from '@slacklineinternational/onsight/react';
import { AthleteParticipationRecord, ContestRecord, EventMetadataRecord } from "@lib/relational-types";
import { DISCIPLINE_DATA, MAP_DISCIPLINE_ENUM_TO_NAME } from "@utils/consts";
import { formatDate } from "@utils/dates";
import { snakeCaseToTitleCase } from "@utils/strings";

const formatDiscipline = (disciplineEnum: string) => {
  const disciplineData = DISCIPLINE_DATA[ MAP_DISCIPLINE_ENUM_TO_NAME[Number(disciplineEnum)]];
  if (!disciplineData) return `${disciplineEnum} (Unknown discipline)`;
  return disciplineData.name;
};

const sortByContestDate = (a: AthleteParticipationRecord | ContestRecord, b: AthleteParticipationRecord | ContestRecord) => {
  const aDate = a.contestDate ? new Date(a.contestDate).getTime() : 0;
  const bDate = b.contestDate ? new Date(b.contestDate).getTime() : 0;
  return bDate - aDate;
};

const ResultEntryListItem = ({
  contestSize,
  date,
  discipline,
  eventName,
  points,
  rank,
}: {
  contestSize: string;
  date?: string;
  discipline: string;
  eventName?: string;
  points?: number;
  rank?: number;
}) => {

  return (
    <li className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p>{eventName || "Unknown event name"}</p>
          <p>
            {formatDiscipline(discipline)} • {snakeCaseToTitleCase(contestSize || "")} • {formatDate(date || "")}
          </p>
        </div>
        <div className="text-right">
          <p>Rank: {rank ? `#${rank}` : '—'}</p>
          <p>Points: {points || '—'}</p>
        </div>
      </div>
    </li>
  );
};

export const ResultEntryList = ({ 
  events,
  contests,
  participations,
  title,
} : { 
  events: EventMetadataRecord[];
  contests: ContestRecord[];
  participations: AthleteParticipationRecord[];
  title: string
}) => {
  const sortedParticipations = participations.sort(sortByContestDate);
  const userId = sortedParticipations[0]?.userId;

  const sortedContests = contests.sort(sortByContestDate).filter(c => c.results?.length > 0);
  if (!sortedParticipations.length && !sortedContests.length) {
    return (
      <EmptyState title={`No ${title.toLowerCase()}`} plain>
        Nothing is recorded for this account.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">
          {sortedParticipations.length + sortedContests.length}
        </span>
      </div>
      <ul className="space-y-2">
        <li>Contest Records</li>
        {sortedContests.map((contest) => {
          const {
            eventName,
            name,
          } = events.find((e) => e.eventId === contest.eventId) || {};

          const resultEntry = contest.results?.find(r => r.id === userId);

          return (
            <ResultEntryListItem
              key={contest.contestId}
              contestSize={contest.contestSize || ""}
              date={contest.contestDate}
              discipline={contest.discipline}
              eventName={eventName || name}
              points={resultEntry?.isaPoints}
              rank={resultEntry?.rank}
            />
          );
        })}
        <li>Participation Records</li>
        {sortedParticipations.map((participation) => {
          const {
            eventName,
            name,
          } = events.find((e) => e.eventId === participation.eventId) || {};

          const {
            contestSize = "",
          } = contests.find((c) => c.contestId === participation.contestId) || {};

          return (
            <ResultEntryListItem
              key={participation.sortKey}
              contestSize={contestSize}
              date={participation.contestDate}
              discipline={participation.discipline}
              eventName={eventName || name}
              points={Number(participation.points)}
              rank={participation.place}
            />
          );
        })}
      </ul>
    </div>
  );
};
