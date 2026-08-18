#!/usr/bin/env node
/**
 * Parses "Possible merged events" warnings out of a migration dry-run log
 * (see migrate-isa-rankings-to-sporthub.ts / event-id-date-collision.md)
 * and writes a structured, pretty-printed JSON report grouped by date.
 *
 * Drops the trailing "share no common prefix — ..." prose from each
 * warning; only the actionable fields (eventId, contest count, contest
 * names with each contest's id/discipline/contestSize) make it into the
 * report.
 *
 * Usage: tsx scripts/parse-collision-report.ts <log-file> <output-json-file>
 * Prints the total number of flagged event groups to stdout (nothing else),
 * so callers can capture it directly: COUNT=$(tsx parse-collision-report.ts ...)
 */
import { readFileSync, writeFileSync } from 'fs';

const [, , logFile, outFile] = process.argv;
if (!logFile || !outFile) {
  console.error('Usage: tsx parse-collision-report.ts <log-file> <output-json-file>');
  process.exit(1);
}

interface FlaggedContest {
  contestId: string;
  discipline: string;
  contestSize: string | null;
}

interface FlaggedGroup {
  name: string;
  contests: FlaggedContest[];
}

interface FlaggedEvent {
  eventId: string;
  contestCount: number;
  groups: FlaggedGroup[];
}

const WARNING_RE = /Possible merged events under (\S+) \((\d+) contests\): (.+?) share no common prefix/;
// Each name group: "name" [id1(discipline|size), id2(discipline|size)]
const GROUP_RE = /"([^"]+)"\s*\[([^\]]*)\]/g;
// Each contest within a group: id(discipline|size) — size is "-" when unknown
const CONTEST_RE = /(\S+?)\(([^|)]*)\|([^)]*)\)/g;

const log = readFileSync(logFile, 'utf-8');
const byDate: Record<string, FlaggedEvent[]> = {};

for (const line of log.split('\n')) {
  const match = line.match(WARNING_RE);
  if (!match) continue;

  const [, eventId, countStr, groupsRaw] = match;
  const dateMatch = eventId.match(/^Event:(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : 'unknown-date';

  const groups: FlaggedGroup[] = [];
  GROUP_RE.lastIndex = 0;
  let groupMatch: RegExpExecArray | null;
  while ((groupMatch = GROUP_RE.exec(groupsRaw)) !== null) {
    const [, name, contestsRaw] = groupMatch;

    const contests: FlaggedContest[] = [];
    CONTEST_RE.lastIndex = 0;
    let contestMatch: RegExpExecArray | null;
    while ((contestMatch = CONTEST_RE.exec(contestsRaw)) !== null) {
      const [, contestId, discipline, contestSize] = contestMatch;
      contests.push({
        contestId,
        discipline,
        contestSize: contestSize === '-' ? null : contestSize,
      });
    }

    groups.push({ name, contests });
  }

  (byDate[date] ??= []).push({
    eventId,
    contestCount: Number(countStr),
    groups,
  });
}

writeFileSync(outFile, JSON.stringify(byDate, null, 2) + '\n');

const totalFlagged = Object.values(byDate).reduce((sum, events) => sum + events.length, 0);
console.log(totalFlagged);
