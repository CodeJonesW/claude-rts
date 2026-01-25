import { WebSocketServer, WebSocket } from 'ws'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { readdirSync, statSync, existsSync, readFileSync } from 'fs'
import { join, relative, dirname } from 'path'
import { homedir } from 'os'

const PORT = 8765
const HTTP_PORT = 8766

// Base path to watch - can be updated dynamically when events come from different directories
let basePath = process.argv[2] || process.cwd()

// Track connected visualizer clients
const clients = new Set<WebSocket>()

// Track current session usage
let currentUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  total_cost_usd: 0,
  session_id: '',
  last_updated: Date.now(),
}

// Read Claude Code stats from the stats-cache.json file
function readClaudeStats(): typeof currentUsage | null {
  const statsFile = join(homedir(), '.claude', 'stats-cache.json')

  if (!existsSync(statsFile)) {
    return null
  }

  try {
    const data = JSON.parse(readFileSync(statsFile, 'utf-8'))
    const modelUsage = data.modelUsage || {}

    // Aggregate across all models
    let inputTokens = 0
    let outputTokens = 0
    let cacheReadTokens = 0
    let cacheCreationTokens = 0
    let costUSD = 0

    for (const model of Object.values(modelUsage) as any[]) {
      inputTokens += model.inputTokens || 0
      outputTokens += model.outputTokens || 0
      cacheReadTokens += model.cacheReadInputTokens || 0
      cacheCreationTokens += model.cacheCreationInputTokens || 0
      costUSD += model.costUSD || 0
    }

    // Calculate cost if not reported (Opus pricing)
    if (costUSD === 0) {
      costUSD = (inputTokens / 1000000 * 15) +
                (outputTokens / 1000000 * 75) +
                (cacheReadTokens / 1000000 * 1.875) +
                (cacheCreationTokens / 1000000 * 18.75)
    }

    return {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_read_input_tokens: cacheReadTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      total_cost_usd: costUSD,
      session_id: 'aggregate',
      last_updated: Date.now(),
    }
  } catch (err) {
    console.error('[Stats] Failed to read stats file:', err)
    return null
  }
}

interface FileEntry {
  path: string
  type: 'file' | 'directory'
}

// Recursively scan directory for files
function scanDirectory(dir: string, maxDepth = 6, currentDepth = 0): FileEntry[] {
  if (currentDepth >= maxDepth) return []

  const files: FileEntry[] = []

  try {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      // Skip hidden files and common non-essential directories
      if (entry.name.startsWith('.')) continue
      if (['node_modules', 'dist', 'build', '.git', '__pycache__', 'venv'].includes(entry.name)) continue

      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        files.push({ path: fullPath, type: 'directory' })
        files.push(...scanDirectory(fullPath, maxDepth, currentDepth + 1))
      } else {
        files.push({ path: fullPath, type: 'file' })
      }
    }
  } catch (err) {
    // Ignore permission errors
  }

  return files
}

// Get file structure for the visualizer
function getFileStructure() {
  const entries = scanDirectory(basePath)
  return {
    basePath: basePath,
    files: entries.map(e => ({
      path: e.path,
      type: e.type,
    }))
  }
}

// Find project root by looking for common project markers
function findProjectRoot(filePath: string): string | null {
  const markers = ['.git', 'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml', 'setup.py', '.claude']
  let dir = filePath.startsWith('/') ? dirname(filePath) : null

  if (!dir) return null

  // Walk up the directory tree looking for project markers
  while (dir && dir !== '/') {
    for (const marker of markers) {
      if (existsSync(join(dir, marker))) {
        return dir
      }
    }
    dir = dirname(dir)
  }

  // Fallback: use the parent directory of the file
  return dirname(filePath)
}

// Check if a path is under the current basePath
function isUnderBasePath(filePath: string): boolean {
  if (!filePath.startsWith('/')) return true // Not an absolute path, assume it's relative to basePath
  return filePath.startsWith(basePath + '/') || filePath === basePath
}

// Update basePath and broadcast new structure to all clients
function switchToDirectory(newBasePath: string) {
  console.log(`[Server] Switching watched directory: ${basePath} -> ${newBasePath}`)
  basePath = newBasePath

  const structure = getFileStructure()
  const initEvent = {
    type: 'init',
    timestamp: Date.now(),
    basePath: structure.basePath,
    files: structure.files,
    details: `Switched to ${structure.files.length} files in ${structure.basePath}`
  }

  // Broadcast to all connected clients
  const message = JSON.stringify(initEvent)
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })

  console.log(`[Server] Broadcasted new structure: ${structure.files.length} files`)
}

// WebSocket server for browser connections
const wss = new WebSocketServer({ port: PORT })

wss.on('connection', (ws: WebSocket) => {
  console.log('[WS] Visualizer connected')
  clients.add(ws)

  ws.on('close', () => {
    console.log('[WS] Visualizer disconnected')
    clients.delete(ws)
  })

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message)
    clients.delete(ws)
  })

  // Send file structure on connect
  const structure = getFileStructure()
  ws.send(JSON.stringify({
    type: 'init',
    timestamp: Date.now(),
    basePath: structure.basePath,
    files: structure.files,
    details: `Watching ${structure.files.length} files in ${structure.basePath}`
  }))

  console.log(`[WS] Sent structure: ${structure.files.length} files from ${structure.basePath}`)
})

// Broadcast event to all connected visualizers
function broadcast(event: object) {
  const message = JSON.stringify(event)
  let sent = 0

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
      sent++
    }
  })

  console.log(`[Broadcast] Sent to ${sent} client(s):`, event)
}

// HTTP server to receive events from Claude Code hooks
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/event') {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const event = JSON.parse(body)

        // Add timestamp if not present
        if (!event.timestamp) {
          event.timestamp = Date.now()
        }

        // Check if the event path is from a different directory
        if (event.path && event.path.startsWith('/') && !isUnderBasePath(event.path)) {
          const newRoot = findProjectRoot(event.path)
          if (newRoot && newRoot !== basePath) {
            switchToDirectory(newRoot)
          }
        }

        broadcast(event)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
        console.error('[HTTP] Parse error:', err)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
  } else if (req.method === 'POST' && req.url === '/usage') {
    // Update usage data from external source (e.g., polling script)
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const usageData = JSON.parse(body)

        // Update current usage tracking
        currentUsage = {
          input_tokens: usageData.usage?.input_tokens || usageData.input_tokens || 0,
          output_tokens: usageData.usage?.output_tokens || usageData.output_tokens || 0,
          cache_read_input_tokens: usageData.usage?.cache_read_input_tokens || usageData.cache_read_input_tokens || 0,
          cache_creation_input_tokens: usageData.usage?.cache_creation_input_tokens || usageData.cache_creation_input_tokens || 0,
          total_cost_usd: usageData.total_cost_usd || 0,
          session_id: usageData.session_id || '',
          last_updated: Date.now(),
        }

        // Broadcast usage update to all clients
        const usageEvent = {
          type: 'usage_update',
          timestamp: Date.now(),
          usage: {
            inputTokens: currentUsage.input_tokens,
            outputTokens: currentUsage.output_tokens,
            cacheReadInputTokens: currentUsage.cache_read_input_tokens,
            cacheCreationInputTokens: currentUsage.cache_creation_input_tokens,
            totalCostUSD: currentUsage.total_cost_usd,
          },
          sessionId: currentUsage.session_id,
        }

        broadcast(usageEvent)

        console.log(`[Usage] Updated: $${currentUsage.total_cost_usd.toFixed(4)} | ${currentUsage.input_tokens + currentUsage.output_tokens} tokens`)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, usage: currentUsage }))
      } catch (err) {
        console.error('[HTTP] Parse error:', err)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
  } else if (req.method === 'GET' && req.url === '/usage') {
    // Read fresh stats from Claude's stats file
    const stats = readClaudeStats()
    if (stats) {
      currentUsage = stats
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      usage: currentUsage,
      total_cost_usd: currentUsage.total_cost_usd,
    }))
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      clients: clients.size,
      uptime: process.uptime()
    }))
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

httpServer.listen(HTTP_PORT, () => {
  const structure = getFileStructure()
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              Claude RTS Event Server                      ║
╠═══════════════════════════════════════════════════════════╣
║  WebSocket (visualizer): ws://localhost:${PORT}               ║
║  HTTP (hooks):           http://localhost:${HTTP_PORT}            ║
╠═══════════════════════════════════════════════════════════╣
║  Watching: ${basePath.padEnd(44)} ║
║  Files:    ${String(structure.files.length).padEnd(44)} ║
╠═══════════════════════════════════════════════════════════╣
║  POST /event  - Send events from hooks                    ║
║  GET  /health - Server status                             ║
╚═══════════════════════════════════════════════════════════╝

Waiting for connections...
`)
})

console.log(`[WS] WebSocket server listening on port ${PORT}`)

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down...')
  wss.close()
  httpServer.close()
  process.exit(0)
})
