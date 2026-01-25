import { useEffect, useRef, useState, useCallback } from 'react'
import type { AgentEvent } from '../types'

interface UseEventStreamOptions {
  url: string
  onEvent: (event: AgentEvent) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useEventStream({ url, onEvent, onConnect, onDisconnect }: UseEventStreamOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [eventHistory, setEventHistory] = useState<AgentEvent[]>([])
  const reconnectTimeoutRef = useRef<number | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        setConnected(true)
        onConnect?.()
      }

      ws.onmessage = (message) => {
        try {
          const event: AgentEvent = JSON.parse(message.data)
          setEventHistory(prev => [...prev.slice(-100), event]) // Keep last 100 events
          onEvent(event)
        } catch {
          console.error('Failed to parse event:', message.data)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        onDisconnect?.()

        // Attempt to reconnect after 2 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect()
        }, 2000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to connect:', error)
    }
  }, [url, onEvent, onConnect, onDisconnect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    connected,
    eventHistory,
    reconnect: connect,
  }
}

// Demo mode - generate fake events for testing
export function useDemoEventStream(onEvent: (event: AgentEvent) => void, paths: string[]) {
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<number | null>(null)

  const start = useCallback(() => {
    if (isRunning || paths.length === 0) return

    setIsRunning(true)
    let index = 0

    const eventTypes: AgentEvent['type'][] = ['file_read', 'file_read', 'file_read', 'file_write', 'directory_list']

    intervalRef.current = window.setInterval(() => {
      const path = paths[Math.floor(Math.random() * paths.length)]
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]

      const event: AgentEvent = {
        type,
        path,
        timestamp: Date.now(),
        details: `${type} on ${path.split('/').pop()}`,
      }

      onEvent(event)
      index++

      if (index > 50) {
        stop()
      }
    }, 800)
  }, [isRunning, paths, onEvent])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setIsRunning(false)
  }, [])

  return { isRunning, start, stop }
}
