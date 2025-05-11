#!/bin/bash

# Don't exit immediately on error — we need to capture status ourselves
set +e

BUILD_STATUS=0
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

LOG_FILE="build_output.log"
ESCAPED_LOGS=""

# Trap to ensure cleanup runs regardless of success/failure
function final_step {
    if [ $BUILD_STATUS -eq 0 ]; then
        STATUS_STR="✅ Build succeeded on branch: $GIT_BRANCH"
    else
        LOG_CONTENT=$(tail -n 50 "$LOG_FILE")

        # Escape the logs for JSON (replace backslashes and quotes)
        ESCAPED_LOGS=$(echo "$LOG_CONTENT" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')

        STATUS_STR="❌ Build failed on branch: $GIT_BRANCH (exit code: $BUILD_STATUS)"
    fi

    if [ -n "$AWS_BRANCH" ]; then
        echo ">>> Running post-build webhook..."

        curl -X POST 'https://discord.com/api/webhooks/1370639745574633584/BkzMi0ab620jq_NUagF4LGR6i3OzvkayadLxgd0rLhTTDG1ekkrxTYRcA5VKBNiiw7Q5' \
                  -H "Content-Type: application/json" \
                  -d "{\"content\": $STATUS_STR\n\`\`\`\n$ESCAPED_LOGS\n\`\`\`\}"
    
    echo $STATUS_STR
}

trap final_step EXIT

echo ">>> Starting build on branch: $GIT_BRANCH"

# Capture build output to file and still show in console
pnpm run build --turbopack 2>&1 | tee "$LOG_FILE"
BUILD_STATUS=${PIPESTATUS[0]}