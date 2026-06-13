import type { H3Event } from 'h3'

/** 用户或客户端主动取消（非超时） */
export class AiAbortedError extends Error {
  constructor(message = '请求已取消') {
    super(message)
    this.name = 'AiAbortedError'
  }
}

export function isAiAbortedError(e: unknown): e is AiAbortedError {
  return e instanceof AiAbortedError || (e as { name?: string })?.name === 'AiAbortedError'
}

/** 合并多个 AbortSignal，任一 abort 则整体 abort */
export function mergeAbortSignals(
  ...signals: (AbortSignal | undefined | null)[]
): AbortSignal {
  const controller = new AbortController()
  const onAbort = () => {
    if (!controller.signal.aborted) controller.abort()
  }
  for (const signal of signals) {
    if (!signal) continue
    if (signal.aborted) {
      onAbort()
      break
    }
    signal.addEventListener('abort', onAbort, { once: true })
  }
  return controller.signal
}

/** 客户端断开 SSE / fetch 时 abort，便于停止 Ollama 推理 */
export function createClientAbortSignal(event: H3Event): AbortSignal {
  const controller = new AbortController()
  const req = event.node.req
  const res = event.node.res

  const onAbort = () => {
    if (!controller.signal.aborted) controller.abort()
  }

  req.on('aborted', onAbort)
  req.on('close', onAbort)
  res.on('close', onAbort)

  return controller.signal
}
