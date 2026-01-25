import { useState, useCallback, useEffect } from 'react'
import type { AgentEvent } from '../types'

export interface TokenUsage {
  // Totals
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  totalTokens: number
  // Cost
  costUSD: number
  // Legacy fields for HUD compatibility
  tokensUsed: number
  tokensRemaining: number
  tokensLimit: number
  // Metadata
  lastUpdated: number
  isRealData: boolean
}

// Pro plan limits (approximate daily limits)
const DEFAULT_TOKEN_LIMIT = 500000

const initialUsage: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  totalTokens: 0,
  costUSD: 0,
  tokensUsed: 0,
  tokensRemaining: DEFAULT_TOKEN_LIMIT,
  tokensLimit: DEFAULT_TOKEN_LIMIT,
  lastUpdated: Date.now(),
  isRealData: false,
}

export function useTokenUsage() {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>(initialUsage)

  const handleEvent = useCallback((event: AgentEvent) => {
    // Handle real usage data from Claude Code
    if (event.type === 'usage_update' && event.usage) {
      const { inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens, totalCostUSD } = event.usage
      const totalTokens = inputTokens + outputTokens + cacheReadInputTokens + cacheCreationInputTokens

      setTokenUsage({
        inputTokens,
        outputTokens,
        cacheReadTokens: cacheReadInputTokens,
        cacheCreationTokens: cacheCreationInputTokens,
        totalTokens,
        costUSD: totalCostUSD,
        tokensUsed: totalTokens,
        tokensRemaining: Math.max(0, DEFAULT_TOKEN_LIMIT - totalTokens),
        tokensLimit: DEFAULT_TOKEN_LIMIT,
        lastUpdated: Date.now(),
        isRealData: true,
      })
      return
    }

    // Handle events that include usage data inline
    if (event.usage) {
      const { inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens, totalCostUSD } = event.usage

      setTokenUsage(prev => {
        const newInput = prev.inputTokens + inputTokens
        const newOutput = prev.outputTokens + outputTokens
        const newCacheRead = prev.cacheReadTokens + cacheReadInputTokens
        const newCacheCreation = prev.cacheCreationTokens + cacheCreationInputTokens
        const totalTokens = newInput + newOutput + newCacheRead + newCacheCreation

        return {
          inputTokens: newInput,
          outputTokens: newOutput,
          cacheReadTokens: newCacheRead,
          cacheCreationTokens: newCacheCreation,
          totalTokens,
          costUSD: prev.costUSD + totalCostUSD,
          tokensUsed: totalTokens,
          tokensRemaining: Math.max(0, DEFAULT_TOKEN_LIMIT - totalTokens),
          tokensLimit: DEFAULT_TOKEN_LIMIT,
          lastUpdated: Date.now(),
          isRealData: true,
        }
      })
      return
    }

    // Legacy: estimate tokens if no real data available
    if (!tokenUsage.isRealData) {
      const estimatedTokens = estimateTokensForEvent(event)
      if (estimatedTokens > 0) {
        setTokenUsage(prev => {
          const newUsed = prev.tokensUsed + estimatedTokens
          return {
            ...prev,
            tokensUsed: newUsed,
            totalTokens: newUsed,
            tokensRemaining: Math.max(0, prev.tokensLimit - newUsed),
            lastUpdated: Date.now(),
          }
        })
      }
    }
  }, [tokenUsage.isRealData])

  // Fetch usage data from server endpoint
  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8766/usage')
      if (response.ok) {
        const data = await response.json()
        if (data.usage) {
          const { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens } = data.usage
          const totalTokens = input_tokens + output_tokens + (cache_read_input_tokens || 0) + (cache_creation_input_tokens || 0)

          // Only update if there's actual data
          if (totalTokens > 0 || data.total_cost_usd > 0) {
            setTokenUsage({
              inputTokens: input_tokens,
              outputTokens: output_tokens,
              cacheReadTokens: cache_read_input_tokens || 0,
              cacheCreationTokens: cache_creation_input_tokens || 0,
              totalTokens,
              costUSD: data.total_cost_usd || 0,
              tokensUsed: totalTokens,
              tokensRemaining: Math.max(0, DEFAULT_TOKEN_LIMIT - totalTokens),
              tokensLimit: DEFAULT_TOKEN_LIMIT,
              lastUpdated: Date.now(),
              isRealData: true,
            })
          }
        }
      }
    } catch {
      // Silently fail - usage endpoint might not be available
    }
  }, [])

  // Poll for usage updates periodically
  useEffect(() => {
    // Fetch immediately
    fetchUsage()

    // Then poll every 5 seconds
    const interval = setInterval(fetchUsage, 5000)

    return () => clearInterval(interval)
  }, [fetchUsage])

  const reset = useCallback(() => {
    setTokenUsage(initialUsage)
  }, [])

  // Set usage directly (for external updates)
  const setUsage = useCallback((usage: Partial<TokenUsage>) => {
    setTokenUsage(prev => ({
      ...prev,
      ...usage,
      lastUpdated: Date.now(),
    }))
  }, [])

  return {
    tokenUsage,
    handleEvent,
    fetchUsage,
    reset,
    setUsage,
  }
}

// Estimate token usage based on event type (legacy fallback)
function estimateTokensForEvent(event: AgentEvent): number {
  switch (event.type) {
    case 'file_read':
      return 200
    case 'file_write':
      return 400
    case 'file_edit':
      return 500
    case 'search':
      return 100
    case 'thinking':
      return 300
    case 'command_run':
      return 75
    case 'directory_list':
      return 30
    case 'task_start':
      return 75
    case 'task_complete':
      return 150
    default:
      return 0
  }
}
