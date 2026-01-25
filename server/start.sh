#!/bin/bash
# Start Claude RTS event server

# First stop any existing servers
./server/stop.sh 2>/dev/null

echo ""
echo "Starting Claude RTS Event Server..."
echo ""

# Start event server in foreground (Ctrl+C to stop)
exec npx tsx server/event-server.ts
