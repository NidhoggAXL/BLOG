export function useCountUp(target: Ref<number> | ComputedRef<number>, durationMs = 600) {
  const display = ref(0)
  let rafId = 0

  function prefersReducedMotion(): boolean {
    if (!import.meta.client) return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function animateTo(value: number) {
    if (rafId) cancelAnimationFrame(rafId)
    if (!import.meta.client || prefersReducedMotion()) {
      display.value = value
      return
    }
    const from = display.value
    const delta = value - from
    if (delta === 0) return
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 3
      display.value = Math.round(from + delta * eased)
      if (t < 1) rafId = requestAnimationFrame(tick)
      else display.value = value
    }
    rafId = requestAnimationFrame(tick)
  }

  watch(
    target,
    (v) => animateTo(v),
    { immediate: true },
  )

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId)
  })

  return display
}
