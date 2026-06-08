import type { H3Event } from 'h3'

export type AiRuntimeConfig = {
  enabled: boolean
  ollamaBaseUrl: string
  chatModel: string
  embedModel: string
  maxContextChunks: number
  wikilinkMaxSuggestions: number
  requestTimeoutMs: number
  publicRateLimitPerMin: number
}

export function getAiConfig(event?: H3Event): AiRuntimeConfig {
  const config = useRuntimeConfig(event)
  return {
    enabled: config.aiEnabled !== false && config.aiEnabled !== 'false',
    ollamaBaseUrl: String(config.ollamaBaseUrl || 'http://127.0.0.1:11434').replace(/\/$/, ''),
    chatModel: String(config.ollamaChatModel || 'qwen3.5:0.8b'),
    embedModel: String(config.ollamaEmbedModel || 'nomic-embed-text'),
    maxContextChunks: Number(config.aiMaxContextChunks || 4),
    wikilinkMaxSuggestions: Number(config.aiWikilinkMaxSuggestions || 6),
    requestTimeoutMs: Number(config.aiRequestTimeoutMs || 120_000),
    publicRateLimitPerMin: Number(config.aiPublicRateLimitPerMin || 10),
  }
}

export function assertAiEnabled(event?: H3Event): AiRuntimeConfig {
  const ai = getAiConfig(event)
  if (!ai.enabled) {
    throw createError({ statusCode: 503, message: 'AI 功能未启用' })
  }
  return ai
}
