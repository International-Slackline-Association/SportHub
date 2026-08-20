import { Metadata } from "next";
import Link from "next/link";
import PageLayout from "@ui/PageLayout";
import { getPendingScoreEdits, approveScoreEdit, rejectScoreEdit } from "../../events/submit/score-review-actions";
import { ContestJudge, ContestResult } from "@lib/relational-types";

export const metadata: Metadata = {
  title: "SportHub - Score Review",
};

function JudgesList({ judges }: { judges: ContestJudge[] }) {
  if (!judges?.length) return <span className="text-gray-400">None</span>;
  return <span>{judges.map(j => j.name).join(', ')}</span>;
}

function ResultsList({ results }: { results: ContestResult[] }) {
  if (!results?.length) return <span className="text-gray-400">None</span>;
  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  return (
    <ul className="stack gap-0.5">
      {sorted.map((r, i) => (
        <li key={i}>#{r.rank} {r.name} — {r.isaPoints} pts</li>
      ))}
    </ul>
  );
}

export default async function ScoreReviewPage() {
  const result = await getPendingScoreEdits();
  const edits = result.edits ?? [];

  return (
    <PageLayout
      title="Score Review"
      description="Review and approve edits to already-published results before they go live."
    >
      <section className="p-4 sm:p-0">
        {edits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No pending score edits.
          </div>
        ) : (
          <div className="stack gap-6">
            {edits.map((edit) => {
              const submittedDate = new Date(edit.submittedAt).toLocaleDateString();
              const eventId = edit.eventId;
              const contestSortKey = edit.contestSortKey;

              return (
                <div key={`${edit.eventId}#${edit.contestSortKey}`} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex flex-wrap gap-4 items-start justify-between p-4 bg-white">
                    <div className="stack gap-1">
                      <Link href={`/events/${encodeURIComponent(edit.eventId)}`} className="font-semibold text-blue-700 hover:underline">
                        {edit.eventName}
                      </Link>
                      <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                        <span>Contest: {edit.discipline || '—'}</span>
                        <span>Submitted by {edit.submittedByName || edit.submittedBy}</span>
                        <span>{submittedDate}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <form action={async () => {
                        "use server";
                        await approveScoreEdit(eventId, contestSortKey);
                      }}>
                        <button
                          type="submit"
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={async () => {
                        "use server";
                        await rejectScoreEdit(eventId, contestSortKey);
                      }}>
                        <button
                          type="submit"
                          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border-t border-gray-100 text-sm">
                    <div className="stack gap-2">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current</h4>
                      <div><span className="text-gray-500">Judges:</span> <JudgesList judges={edit.previousJudges} /></div>
                      <div><span className="text-gray-500">Results:</span> <ResultsList results={edit.previousResults} /></div>
                    </div>
                    <div className="stack gap-2">
                      <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Proposed</h4>
                      <div><span className="text-gray-500">Judges:</span> <JudgesList judges={edit.proposedJudges} /></div>
                      <div><span className="text-gray-500">Results:</span> <ResultsList results={edit.proposedResults} /></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageLayout>
  );
}
