#!/usr/bin/env node
/**
 * Parses "Possible merged events" warnings out of a migration dry-run log
 * (see migrate-isa-rankings-to-sporthub.ts / event-id-date-collision.md)
 * and writes a structured, pretty-printed JSON report grouped by date.
 *
 * Drops the trailing "share no common prefix — ..." prose from each
 * warning; only the actionable fields (eventId, contest count, contest
 * names with their contestIds) make it into the report.
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

interface FlaggedGroup {
  name: string;
  contestIds: string[];
}

interface FlaggedEvent {
  eventId: string;
  contestCount: number;
  groups: FlaggedGroup[];
}

const WARNING_RE = /Possible merged events under (\S+) \((\d+) contests\): (.+?) share no common prefix/;
const GROUP_RE = /"([^"]+)"\s*\[([^\]]*)\]/g;

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
    const [, name, idsRaw] = groupMatch;
    groups.push({
      name,
      contestIds: idsRaw.split(',').map(id => id.trim()).filter(Boolean),
    });
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
