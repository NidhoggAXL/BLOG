import { ensureMarkedConfigured, preloadMarkedHighlighter } from '~/utils/markedSetup'

/** 空闲时预热 Shiki，减轻首篇正文渲染等待 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const run = () => {
    ensureMarkedConfigured()
    preloadMarkedHighlighter()
  }

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 4000 })
  } else {
    setTimeout(run, 1)
  }
})
