#!/bin/bash
# Start all services for Claude RTS

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}Starting Claude RTS Services${NC}"
echo ""

# Trap to kill all background processes on exit
trap 'echo ""; echo "Stopping all services..."; kill $(jobs -p) 2>/dev/null; exit 0' SIGINT SIGTERM

# Start event server
echo -e "${CYAN}[1/3]${NC} Starting event server..."
npx tsx server/event-server.ts &
sleep 2

# Start usage poller
echo -e "${CYAN}[2/3]${NC} Starting usage poller..."
./server/poll-usage.sh 3 &
sleep 1

# Start frontend
echo -e "${CYAN}[3/3]${NC} Starting frontend dev server..."
echo ""
npm run dev

# Wait for all background processes
wait
