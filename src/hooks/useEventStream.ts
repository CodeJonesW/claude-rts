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
  const isConnectingRef = useRef(false)
  const mountedRef = useRef(true)

  // Use refs for callbacks to avoid dependency issues
  const onEventRef = useRef(onEvent)
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)

  // Update refs when callbacks change
  useEffect(() => {
    onEventRef.current = onEvent
    onConnectRef.current = onConnect
    onDisconnectRef.current = onDisconnect
  }, [onEvent, onConnect, onDisconnect])

  const connect = useCallback(() => {
    // Guard against multiple simultaneous connection attempts
    if (isConnectingRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return

    isConnectingRef.current = true

    try {
      console.log('[WS] Connecting to', url)
      const ws = new WebSocket(url)

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close()
          return
        }
        console.log('[WS] Connected')
        isConnectingRef.current = false
        setConnected(true)
        onConnectRef.current?.()
      }

      ws.onmessage = (message) => {
        if (!mountedRef.current) return
        try {
          const event: AgentEvent = JSON.parse(message.data)
          setEventHistory(prev => [...prev.slice(-100), event])
          onEventRef.current(event)
        } catch {
          console.error('[WS] Failed to parse event:', message.data)
        }
      }

      ws.onclose = () => {
        console.log('[WS] Disconnected')
        isConnectingRef.current = false
        wsRef.current = null

        if (!mountedRef.current) return

        setConnected(false)
        onDisconnectRef.current?.()

        // Reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (mountedRef.current) {
            connect()
          }
        }, 3000)
      }

      ws.onerror = () => {
        // Error is followed by close, so just log it
        console.log('[WS] Connection error (server may not be running)')
        isConnectingRef.current = false
      }

      wsRef.current = ws
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error)
      isConnectingRef.current = false
    }
  }, [url])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    isConnectingRef.current = false
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      disconnect()
    }
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
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

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

      onEventRef.current(event)
      index++

      if (index > 50) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        setIsRunning(false)
      }
    }, 800)
  }, [isRunning, paths])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setIsRunning(false)
  }, [])

  return { isRunning, start, stop }
}
