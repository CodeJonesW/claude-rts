#!/bin/bash
# Poll Claude Code usage and send to the event server
# Usage: ./poll-usage.sh [interval_seconds]

INTERVAL="${1:-3}"
SERVER_URL="http://localhost:8766/usage"
STATS_FILE="$HOME/.claude/stats-cache.json"

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}Claude Code Usage Monitor${NC}"
echo "Server: $SERVER_URL"
echo "Interval: ${INTERVAL}s"
echo ""

# Track last sent data to avoid duplicate sends
LAST_SENT=""

# Main loop
while true; do
  if [ -f "$STATS_FILE" ]; then
    # Read the stats file and extract usage
    # Use a simpler jq approach
    # Extract usage and calculate cost estimate
    # Opus pricing: $15/M input, $75/M output, $1.875/M cache read, $18.75/M cache write
    USAGE_JSON=$(jq -c '
      (.modelUsage | to_entries | map(.value.inputTokens // 0) | add // 0) as $in |
      (.modelUsage | to_entries | map(.value.outputTokens // 0) | add // 0) as $out |
      (.modelUsage | to_entries | map(.value.cacheReadInputTokens // 0) | add // 0) as $cache_r |
      (.modelUsage | to_entries | map(.value.cacheCreationInputTokens // 0) | add // 0) as $cache_w |
      (.modelUsage | to_entries | map(.value.costUSD // 0) | add // 0) as $reported_cost |
      (if $reported_cost > 0 then $reported_cost else
        (($in / 1000000 * 15) + ($out / 1000000 * 75) + ($cache_r / 1000000 * 1.875) + ($cache_w / 1000000 * 18.75))
      end) as $cost |
      {
        input_tokens: $in,
        output_tokens: $out,
        cache_read_input_tokens: $cache_r,
        cache_creation_input_tokens: $cache_w,
        cost_usd: $cost
      }
    ' "$STATS_FILE" 2>/dev/null)

    if [ -n "$USAGE_JSON" ] && [ "$USAGE_JSON" != "$LAST_SENT" ]; then
      # Build the payload for the server
      PAYLOAD=$(echo "$USAGE_JSON" | jq -c '{
        session_id: "aggregate",
        usage: {
          input_tokens: .input_tokens,
          output_tokens: .output_tokens,
          cache_read_input_tokens: .cache_read_input_tokens,
          cache_creation_input_tokens: .cache_creation_input_tokens
        },
        total_cost_usd: .cost_usd
      }')

      # Send to server
      RESPONSE=$(curl -s -X POST "$SERVER_URL" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        --connect-timeout 2 \
        --max-time 5 2>/dev/null)

      if [ $? -eq 0 ]; then
        # Extract stats for display
        IN=$(echo "$USAGE_JSON" | jq -r '.input_tokens')
        OUT=$(echo "$USAGE_JSON" | jq -r '.output_tokens')
        CACHE_R=$(echo "$USAGE_JSON" | jq -r '.cache_read_input_tokens')
        CACHE_W=$(echo "$USAGE_JSON" | jq -r '.cache_creation_input_tokens')
        COST=$(echo "$USAGE_JSON" | jq -r '.cost_usd')

        TOTAL=$((IN + OUT + CACHE_R + CACHE_W))
        echo -e "$(date '+%H:%M:%S') | ${CYAN}Total:${NC} ${TOTAL} tokens | ${CYAN}Cost:${NC} \$${COST}"
        LAST_SENT="$USAGE_JSON"
      fi
    fi
  else
    echo "Stats file not found: $STATS_FILE"
  fi

  sleep "$INTERVAL"
done
