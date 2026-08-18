#!/bin/bash

# Audit Event Collisions Script
#
# Runs the ISA-Rankings -> SportHub migration in --dry-run mode and parses
# out just the "Possible merged events" warnings (see
# docs/known-issues/event-id-date-collision.md) into a structured,
# pretty-printed JSON report grouped by date — the descriptive prose is
# dropped, only the actionable fields remain:
#
#   {
#     "2021-08-27": [
#       {
#         "eventId": "Event:2021-08-27:bern-ch",
#         "contestCount": 2,
#         "groups": [
#           { "name": "Bern City Slack #12", "contests": [
#             { "contestId": "e02e49", "discipline": "RIGGING", "contestSize": "OPEN" }
#           ] },
#           { "name": "Rigging Masters", "contests": [
#             { "contestId": "0bacaf", "discipline": "RIGGING", "contestSize": "CHALLENGE" }
#           ] }
#         ]
#       }
#     ]
#   }
#
# Usage:
#   ./scripts/audit-event-collisions.sh          # against local DynamoDB
#   ./scripts/audit-event-collisions.sh aws      # against production (read-only scan)
#
# Workflow:
#   1. Run this script.
#   2. For each flagged eventId in the report, decide which group's
#      contestIds belong to a different real event than the rest — check
#      "Not every warning is a real collision" in the docs first, this is
#      often a false positive (see the Bern example above).
#   3. Add those contestIds to EVENT_ID_OVERRIDES in
#      src/lib/migrations/migrate-isa-rankings-to-sporthub.ts.
#   4. Re-run this script and confirm the warning is gone.
#   5. Run the real migration (migrate:execute or migrate:aws:execute).

set -euo pipefail

MODE="${1:-local}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="migration-dry-run-${TIMESTAMP}.log"
REPORT_FILE="migration-collision-report-${TIMESTAMP}.json"

if [ "$MODE" = "aws" ]; then
  echo -e "${YELLOW}Running migration dry-run against AWS (production source, read-only scan)...${NC}"
  PNPM_SCRIPT="migrate:aws:dry-run"
elif [ "$MODE" = "local" ]; then
  echo -e "${YELLOW}Running migration dry-run against local DynamoDB...${NC}"
  PNPM_SCRIPT="migrate:dry-run"
else
  echo -e "${RED}Unknown mode '${MODE}'. Usage: $0 [local|aws]${NC}"
  exit 1
fi

echo "Full log: ${LOG_FILE}"
echo ""

pnpm "${PNPM_SCRIPT}" 2>&1 | tee "${LOG_FILE}"

echo ""
echo -e "${YELLOW}Parsing collision warnings into JSON, grouped by date...${NC}"
COUNT=$(npx tsx scripts/parse-collision-report.ts "${LOG_FILE}" "${REPORT_FILE}")

echo ""
if [ "${COUNT}" -eq 0 ]; then
  echo -e "${GREEN}No collision warnings found. Report: ${REPORT_FILE} ({})${NC}"
else
  echo -e "${RED}Found ${COUNT} flagged event group(s). Report: ${REPORT_FILE}${NC}"
  echo ""
  cat "${REPORT_FILE}"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  echo "  1. For each eventId above, decide which contestId(s) belong to a"
  echo "     different real event than the rest of the group (the report"
  echo "     lists contestIds grouped by contest name) — see 'Not every"
  echo "     warning is a real collision' in docs/known-issues/"
  echo "     event-id-date-collision.md before assuming it is one."
  echo "  2. Add those contestIds to EVENT_ID_OVERRIDES in"
  echo "     src/lib/migrations/migrate-isa-rankings-to-sporthub.ts."
  echo "  3. Re-run this script and confirm the warning clears."
  echo "  4. Run the real migration (migrate:execute / migrate:aws:execute)."
fi
