#!/bin/bash
# ralph.sh - Spawns fresh Claude Code instances in a loop to implement user stories
# Usage: ./ralph.sh [max_iterations]

set -euo pipefail

MAX_ITERATIONS=${1:-25}
ITERATION=0
LOG_DIR="ralph-logs"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Ralph Loop Starting ===${NC}"
echo -e "Max iterations: ${MAX_ITERATIONS}"
echo ""

# Check we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found. Run this from the project root.${NC}"
  exit 1
fi

if [ ! -f "prd.json" ]; then
  echo -e "${RED}Error: prd.json not found. Cannot proceed without story definitions.${NC}"
  exit 1
fi

if [ ! -f "prompt.md" ]; then
  echo -e "${RED}Error: prompt.md not found. Cannot proceed without prompt template.${NC}"
  exit 1
fi

# Check we're on the feature branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != ralph/* ]]; then
  echo -e "${YELLOW}Warning: Not on a ralph/* branch (current: ${CURRENT_BRANCH})${NC}"
  echo -e "Continuing anyway..."
fi

# Create log directory
mkdir -p "$LOG_DIR"

# Create ralph-progress.txt if it doesn't exist
if [ ! -f "ralph-progress.txt" ]; then
  echo "# Ralph Loop Progress Log" > ralph-progress.txt
  echo "" >> ralph-progress.txt
fi

# Function to count remaining stories
count_remaining() {
  grep -c '"passes": false' prd.json 2>/dev/null || echo "0"
}

# Function to get next story title
get_next_story() {
  python3 -c "
import json
with open('prd.json') as f:
    data = json.load(f)
for s in data['stories']:
    if not s['passes']:
        print(f\"Story {s['id']}: {s['title']}\")
        break
" 2>/dev/null || echo "Unknown"
}

echo -e "${BLUE}Stories remaining: $(count_remaining)${NC}"
echo ""

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  REMAINING=$(count_remaining)

  # Check if all stories are done
  if [ "$REMAINING" -eq 0 ]; then
    echo -e "${GREEN}=== All stories complete! ===${NC}"
    exit 0
  fi

  NEXT_STORY=$(get_next_story)
  echo -e "${YELLOW}--- Iteration ${ITERATION}/${MAX_ITERATIONS} ---${NC}"
  echo -e "Next: ${NEXT_STORY}"
  echo -e "Remaining: ${REMAINING} stories"
  echo ""

  LOG_FILE="${LOG_DIR}/iteration-${ITERATION}.log"

  # Run Claude with the prompt
  echo -e "${BLUE}Spawning Claude instance...${NC}"
  if claude --print --dangerously-skip-permissions -p "$(cat prompt.md)" > "$LOG_FILE" 2>&1; then
    echo -e "${GREEN}Claude exited successfully${NC}"
  else
    EXIT_CODE=$?
    echo -e "${RED}Claude exited with code ${EXIT_CODE}${NC}"
  fi

  # Check if output contains COMPLETE signal
  if grep -q '<promise>COMPLETE</promise>' "$LOG_FILE" 2>/dev/null; then
    echo -e "${GREEN}=== COMPLETE signal received! All stories done. ===${NC}"
    echo ""
    echo "Logs saved to: ${LOG_DIR}/"
    exit 0
  fi

  # Show brief summary of what happened
  LINES=$(wc -l < "$LOG_FILE")
  echo -e "Output: ${LINES} lines (saved to ${LOG_FILE})"

  # Brief pause between iterations
  sleep 2
  echo ""
done

# If we get here, we hit max iterations
REMAINING=$(count_remaining)
echo -e "${RED}=== Max iterations (${MAX_ITERATIONS}) reached ===${NC}"
echo -e "Stories remaining: ${REMAINING}"
echo "Logs saved to: ${LOG_DIR}/"
exit 1
