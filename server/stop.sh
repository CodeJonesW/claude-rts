#!/bin/bash
# Stop all Claude RTS server processes

echo "Stopping Claude RTS servers..."

# Kill event server (tsx/node running event-server.ts)
pkill -f "event-server.ts" 2>/dev/null && echo "  Stopped event server" || echo "  Event server not running"

# Kill poll script if running
pkill -f "poll-usage.sh" 2>/dev/null && echo "  Stopped poll script" || echo "  Poll script not running"

# Kill any node processes on our ports
lsof -ti:8765 | xargs kill 2>/dev/null && echo "  Freed port 8765" || true
lsof -ti:8766 | xargs kill 2>/dev/null && echo "  Freed port 8766" || true

echo "Done."
