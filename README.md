# Claude RTS (Real-Time Strategy Visualizer)

A real-time 3D visualization system for Claude Code activity. Watch your codebase exploration and file operations come to life in an isometric RTS-style interface.

![Claude RTS UI](public/ui.png)

## Features

- **Real-time visualization**: See file reads, writes, edits, and searches as units moving across an isometric grid
- **Codebase mapping**: Automatically scans and maps your project structure
- **Token usage tracking**: Monitor Claude Code API usage and costs in real-time
- **File viewer**: Click on files in the visualization to view their contents
- **WebSocket streaming**: Live updates as Claude Code performs operations

## Prerequisites

Before setting up, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **jq** (JSON processor) - for usage polling
  - macOS: `brew install jq`
  - Linux: `sudo apt-get install jq` or `sudo yum install jq`
- **curl** (usually pre-installed on macOS/Linux)

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd claude-rts
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Make server scripts executable**:
   ```bash
   chmod +x server/*.sh
   ```

## Running the Project

### Option 1: Start Everything (Recommended)

Start all services (event server, usage poller, and frontend) with one command:

```bash
npm run start:all
```

This will:
- Start the event server on port 8765 (WebSocket) and 8766 (HTTP)
- Start the usage poller to monitor Claude Code stats
- Start the Vite dev server (typically on port 5173)

### Option 2: Start Services Separately

**Start the event server only:**
```bash
npm run server
# or
./server/start.sh
```

**Start the frontend only:**
```bash
npm run dev
```

**Start both together:**
```bash
npm start
# or with a specific path to watch
npm start --path=/path/to/your/project
```

### Option 3: Manual Start

1. **Terminal 1** - Start the event server:
   ```bash
   npx tsx server/event-server.ts
   ```

2. **Terminal 2** (Optional) - Start the usage poller:
   ```bash
   ./server/poll-usage.sh
   ```

3. **Terminal 3** - Start the frontend:
   ```bash
   npm run dev
   ```

## Accessing the Application

Once running, open your browser to:
- **Frontend**: http://localhost:5173 (or the port shown in the terminal)
- **Event Server Health**: http://localhost:8766/health

## Ports Used

- **8765**: WebSocket server for real-time event streaming
- **8766**: HTTP server for receiving events and serving file contents
- **5173** (default): Vite dev server for the frontend

## Optional: Claude Code Integration

To receive real-time events from Claude Code, you can set up a hook script:

1. **Configure Claude Code** to use the hook script:
   - Point Claude Code's hook configuration to: `server/claude-hook.sh`
   - The hook will automatically send events to the event server

2. **The hook script** (`server/claude-hook.sh`) will:
   - Listen for Claude Code tool calls (Read, Write, Edit, etc.)
   - Send events to `http://localhost:8766/event`
   - Work automatically without blocking Claude Code

## Usage Polling

The usage poller (`server/poll-usage.sh`) reads Claude Code statistics from:
- `~/.claude/stats-cache.json`

It polls every 3 seconds (configurable) and sends usage updates to the event server. This provides real-time token usage and cost tracking in the visualization.

## Stopping Services

To stop all services:

```bash
./server/stop.sh
```

Or manually:
- Press `Ctrl+C` in the terminal running the services
- The `start-all.sh` script will automatically clean up background processes

## Project Structure

```
claude-rts/
├── src/
│   ├── components/      # React components (Scene, HUD, Units, etc.)
│   ├── hooks/          # Custom React hooks (event streaming, state management)
│   └── types.ts        # TypeScript type definitions
├── server/
│   ├── event-server.ts # Main event server (WebSocket + HTTP)
│   ├── claude-hook.sh  # Hook script for Claude Code integration
│   ├── poll-usage.sh   # Usage statistics poller
│   ├── start-all.sh    # Start all services script
│   ├── start.sh        # Start event server script
│   └── stop.sh         # Stop all services script
└── package.json        # Dependencies and npm scripts
```

## Development

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run server` - Start event server only
- `npm start` - Start server and frontend together
- `npm run start:all` - Start all services (server, poller, frontend)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

### Port Already in Use

If ports 8765 or 8766 are already in use:

```bash
./server/stop.sh
```

This will kill any existing processes on those ports.

### Usage Poller Not Working

- Ensure `jq` is installed: `which jq`
- Check that `~/.claude/stats-cache.json` exists (created by Claude Code)
- Verify the event server is running on port 8766

### WebSocket Connection Issues

- Ensure the event server is running: `curl http://localhost:8766/health`
- Check browser console for connection errors
- Verify firewall isn't blocking local connections

### File Structure Not Loading

- The event server scans the current working directory by default
- Pass a path as an argument: `npx tsx server/event-server.ts /path/to/project`
- Check that the directory is readable and contains files

## License

[Add your license here]
