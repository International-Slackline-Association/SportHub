'use client';

import { ReactNode } from "react";
import { useFormikContext } from "formik";
import { ContestFormValues, ContestResultEntry, EventSubmissionFormValues } from "../types";
import { getContestNameFromForm } from "./contest-inputs/TabbedContestForms";
import { snakeCaseToTitleCase } from "@utils/strings";
import { disciplineOptions, ageCategoryOptions, judgingSystemOptions, contestSizeOptions, eventGenderOptions } from "@ui/Form/commonOptions";
import { COUNTRIES } from "@utils/countries";
import { Option } from "@ui/Form";

const labelOf = (opts: Option[], val: string | undefined) =>
  opts.find(o => o.value === val)?.label ?? (val ? snakeCaseToTitleCase(val) : "—");

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  value ? (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 min-w-32 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  ) : null
);

const ContestSummary = ({ contest, idx, values }: { contest: ContestFormValues; idx: number; values: EventSubmissionFormValues }) => {
  const name = getContestNameFromForm(values, idx);
  const judges = contest.judges?.filter(j => j.name || j.id) ?? [];
  const results = contest.results ?? [];

  return (
    <div className="border border-gray-200 rounded-lg p-4 stack gap-2">
      <h4 className="font-semibold text-sm">{name || `Contest ${idx + 1}`}</h4>
      <div className="stack gap-1">
        <Row label="Discipline" value={labelOf(disciplineOptions, contest.discipline)} />
        <Row label="Gender" value={labelOf(eventGenderOptions, contest.gender)} />
        <Row label="Age category" value={labelOf(ageCategoryOptions, contest.ageCategory)} />
        <Row label="Contest size" value={labelOf(contestSizeOptions, contest.contestSize)} />
        <Row label="Judging system" value={labelOf(judgingSystemOptions, contest.judgingSystem)} />
        {(contest.startDate || contest.endDate) && (
          <Row
            label="Dates"
            value={[contest.startDate, contest.endDate].filter(Boolean).join(" – ")}
          />
        )}
        {contest.totalPrizeValue ? (
          <Row label="Prize pool" value={`€${contest.totalPrizeValue.toLocaleString()}`} />
        ) : null}
        <Row
          label="Judges"
          value={
            judges.length
              ? judges.map(j =>
                  j.pendingUser
                    ? `${j.pendingUser.name} ${j.pendingUser.surname} (new)`
                    : j.name || j.id
                ).join(", ")
              : <span className="text-gray-400">None added</span>
          }
        />
        <Row
          label="Results"
          value={
            results.length
              ? `${results.length} athlete${results.length === 1 ? "" : "s"}`
              : <span className="text-gray-400">None added</span>
          }
        />
        {results.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left py-1 pr-3 font-medium">Rank</th>
                  <th className="text-left py-1 pr-3 font-medium">Athlete</th>
                  <th className="text-right py-1 font-medium">ISA pts</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r: ContestResultEntry, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1 pr-3">{r.rank}</td>
                    <td className="py-1 pr-3">
                      {r.pendingUser
                        ? <>{r.pendingUser.name} {r.pendingUser.surname}{" "}<span className="text-amber-600 font-medium">(new)</span></>
                        : r.name || r.id || "—"}
                    </td>
                    <td className="py-1 text-right">{r.isaPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const ReviewEventForm = () => {
  const { values } = useFormikContext<EventSubmissionFormValues>();
  const { event, contests = [] } = values;

  const countryName = COUNTRIES.find(c => c.code === event.country)?.name ?? event.country;

  const socialEntries = Object.entries(event.socialMedia ?? {}).filter(([, v]) => v);

  return (
    <div className="stack gap-6 p-4 sm:p-0">

      {/* Event details */}
      <section className="stack gap-3">
        <h3 className="font-semibold border-b border-gray-200 pb-2">Event Details</h3>
        <div className="stack gap-1">
          <div className="text-base font-medium">{event.name || "—"}</div>
          <Row label="Dates" value={[event.startDate, event.endDate].filter(Boolean).join(" – ")} />
          <Row label="Location" value={[event.city, countryName].filter(Boolean).join(", ")} />
          <Row label="Website" value={event.website} />
          <Row
            label="Disciplines"
            value={
              event.disciplines?.length
                ? event.disciplines.map(d => labelOf(disciplineOptions, d)).join(", ")
                : undefined
            }
          />
          {socialEntries.length > 0 && (
            <Row
              label="Social media"
              value={socialEntries.map(([platform, handle]) => `${snakeCaseToTitleCase(platform)}: ${handle}`).join(" · ")}
            />
          )}
        </div>
      </section>

      {/* Contests */}
      <section className="stack gap-3">
        <h3 className="font-semibold border-b border-gray-200 pb-2">
          Contests ({contests.length})
        </h3>
        {contests.length === 0 ? (
          <p className="text-sm text-gray-400">No contests added.</p>
        ) : (
          <div className="stack gap-3">
            {contests.map((contest, idx) => (
              <ContestSummary key={idx} contest={contest} idx={idx} values={values} />
            ))}
          </div>
        )}
      </section>

      {/* Submission note */}
      <div className="text-sm text-gray-500 border border-gray-200 rounded-lg p-3 bg-gray-50">
        Submitting will save this event as a <strong>draft</strong>. An admin must approve it before it appears publicly on the site.
      </div>

    </div>
  );
};
