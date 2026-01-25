// Test script to send fake events to the event server
// Run with: npx tsx server/test-events.ts

const HTTP_URL = 'http://localhost:8766/event'

const DEMO_PATHS = [
  '/project/src/App.tsx',
  '/project/src/components/Header.tsx',
  '/project/src/hooks/useAuth.ts',
  '/project/src/utils/format.ts',
  '/project/src/api/client.ts',
  '/project/package.json',
]

const EVENT_TYPES = ['file_read', 'file_read', 'file_read', 'file_write', 'directory_list'] as const

async function sendEvent(event: object) {
  try {
    const res = await fetch(HTTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    const data = await res.json()
    console.log('Sent:', event, '→', data)
  } catch (err) {
    console.error('Failed to send:', err)
  }
}

async function runDemo() {
  console.log('Starting test event stream...')
  console.log('Make sure the event server is running (npm run server)')
  console.log('And the visualizer is open (npm run dev)\n')

  for (let i = 0; i < 15; i++) {
    const path = DEMO_PATHS[Math.floor(Math.random() * DEMO_PATHS.length)]
    const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)]

    await sendEvent({
      type,
      path,
      timestamp: Date.now(),
      details: `${type} on ${path.split('/').pop()}`,
    })

    // Wait 500-1500ms between events
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
  }

  console.log('\nDone! Sent 15 test events.')
}

runDemo()
