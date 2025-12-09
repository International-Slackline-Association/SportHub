#!/bin/bash

# Revalidate Static Pages Script
#
# This script triggers on-demand revalidation of static pages after updating data.
#
# Usage:
#   ./scripts/revalidate-pages.sh              # Revalidate all static pages
#   ./scripts/revalidate-pages.sh rankings     # Revalidate only /rankings
#   ./scripts/revalidate-pages.sh events       # Revalidate only /events

# Configuration
API_URL="${NEXT_PUBLIC_URL:-http://localhost:3000}/api/revalidate"
SECRET="${REVALIDATE_SECRET}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if REVALIDATE_SECRET is set
if [ -z "$SECRET" ]; then
  echo -e "${YELLOW}Warning: REVALIDATE_SECRET not set. Revalidation may fail in production.${NC}"
  echo "Set it in your .env file or environment variables."
  echo ""
fi

# Function to revalidate a path
revalidate() {
  local path=$1
  echo "Revalidating: $path"

  response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"path\": \"$path\", \"secret\": \"$SECRET\"}" 2>&1)

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "000" ] || [ -z "$http_code" ]; then
    echo -e "${RED}✗ Failed to connect to server${NC}"
    echo "Make sure your Next.js server is running at: ${API_URL%/api/revalidate}"
    echo "Run: pnpm dev"
  elif echo "$body" | grep -q '"revalidated":true'; then
    echo -e "${GREEN}✓ Successfully revalidated $path${NC}"
  else
    echo -e "${RED}✗ Failed to revalidate $path (HTTP $http_code)${NC}"
    echo "Response: $body"
  fi
  echo ""
}

# Main logic
if [ -z "$1" ]; then
  # No argument - revalidate all
  echo "Revalidating all static pages..."
  echo ""
  revalidate "/rankings"
  revalidate "/events"
elif [ "$1" = "rankings" ]; then
  revalidate "/rankings"
elif [ "$1" = "events" ]; then
  revalidate "/events"
else
  echo -e "${RED}Unknown page: $1${NC}"
  echo "Usage: $0 [rankings|events]"
  exit 1
fi

echo -e "${GREEN}Done!${NC}"
