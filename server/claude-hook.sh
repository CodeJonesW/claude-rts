#!/bin/bash
# Claude Code hook script - sends tool events to the RTS visualizer
# This script receives JSON on stdin from Claude Code

# Read the hook data from stdin
HOOK_DATA=$(cat)

# Extract tool name and path from the JSON
TOOL_NAME=$(echo "$HOOK_DATA" | grep -o '"tool_name":"[^"]*"' | cut -d'"' -f4)
TOOL_INPUT=$(echo "$HOOK_DATA" | grep -o '"tool_input":{[^}]*}' | head -1)

# Map Claude Code tools to our event types
case "$TOOL_NAME" in
  "Read"|"read")
    EVENT_TYPE="file_read"
    FILE_PATH=$(echo "$TOOL_INPUT" | grep -o '"file_path":"[^"]*"' | cut -d'"' -f4)
    ;;
  "Write"|"write")
    EVENT_TYPE="file_write"
    FILE_PATH=$(echo "$TOOL_INPUT" | grep -o '"file_path":"[^"]*"' | cut -d'"' -f4)
    ;;
  "Edit"|"edit")
    EVENT_TYPE="file_edit"
    FILE_PATH=$(echo "$TOOL_INPUT" | grep -o '"file_path":"[^"]*"' | cut -d'"' -f4)
    ;;
  "Glob"|"glob")
    EVENT_TYPE="search"
    FILE_PATH=$(echo "$TOOL_INPUT" | grep -o '"pattern":"[^"]*"' | cut -d'"' -f4)
    ;;
  "Grep"|"grep")
    EVENT_TYPE="search"
    FILE_PATH=$(echo "$TOOL_INPUT" | grep -o '"pattern":"[^"]*"' | cut -d'"' -f4)
    ;;
  "Bash"|"bash")
    EVENT_TYPE="command_run"
    FILE_PATH=$(echo "$TOOL_INPUT" | grep -o '"command":"[^"]*"' | cut -d'"' -f4 | head -c 50)
    ;;
  *)
    EVENT_TYPE="thinking"
    FILE_PATH="$TOOL_NAME"
    ;;
esac

# Only send if we have something meaningful
if [ -n "$FILE_PATH" ]; then
  # Build the event JSON
  EVENT_JSON=$(cat <<EOF
{
  "type": "$EVENT_TYPE",
  "path": "$FILE_PATH",
  "timestamp": $(date +%s000),
  "details": "$TOOL_NAME: $FILE_PATH"
}
EOF
)

  # Send to the event server (fire and forget, ignore errors)
  curl -s -X POST http://localhost:8766/event \
    -H "Content-Type: application/json" \
    -d "$EVENT_JSON" \
    --connect-timeout 1 \
    --max-time 2 \
    > /dev/null 2>&1 &
fi

# Always exit 0 so we don't block Claude Code
exit 0
