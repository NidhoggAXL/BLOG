
export type AdminChartTheme = {
  colors: string[]
  text: string
  muted: string
  axis: string
  grid: string
  tooltipBg: string
  tooltipBorder: string
  animation: boolean
}

const LIGHT_FALLBACK: AdminChartTheme = {
  colors: ['#c45c26', '#2d8a6e', '#b8860b', '#c43d4d', '#7a5a8c'],
  text: '#1a1a18',
  muted: '#8a8a82',
  axis: '#e4e2dc',
  grid: 'rgba(196, 92, 38, 0.14)',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e4e2dc',
  animation: true,
}

const DARK_FALLBACK: AdminChartTheme = {
  colors: ['#e07a3a', '#3db896', '#e0b84a', '#e86a78', '#a88bc4'],
  text: '#e8e6e1',
  muted: '#787670',
  axis: '#333330',
  grid: 'rgba(224, 122, 58, 0.18)',
  tooltipBg: '#1e1e1c',
  tooltipBorder: '#333330',
  animation: true,
}

function fallbackForMode(mode: 'light' | 'dark'): AdminChartTheme {
  const base = mode === 'dark' ? DARK_FALLBACK : LIGHT_FALLBACK
  return { ...base, colors: [...base.colors] }
}

function readCssVar(name: string, fallback: string): string {
  if (!import.meta.client) return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function prefersReducedMotion(): boolean {
  if (!import.meta.client) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function buildTheme(mode: 'light' | 'dark'): AdminChartTheme {
  const fb = fallbackForMode(mode)
  return {
    colors: [
      readCssVar('--chart-1', fb.colors[0]),
      readCssVar('--chart-2', fb.colors[1]),
      readCssVar('--chart-3', fb.colors[2]),
      readCssVar('--chart-4', fb.colors[3]),
      readCssVar('--chart-5', fb.colors[4]),
    ],
    text: readCssVar('--text', fb.text),
    muted: readCssVar('--chart-muted', fb.muted),
    axis: readCssVar('--chart-axis', fb.axis),
    grid: readCssVar('--chart-grid', fb.grid),
    tooltipBg: readCssVar('--chart-tooltip-bg', fb.tooltipBg),
    tooltipBorder: readCssVar('--chart-tooltip-border', fb.tooltipBorder),
    animation: !prefersReducedMotion(),
  }
}

/** DOM class 更新后再读 CSS 变量，避免日夜切换瞬间读到旧主题色 */
function scheduleThemeRead(
  mode: 'light' | 'dark',
  apply: (theme: AdminChartTheme) => void,
) {
  if (!import.meta.client) {
    apply(buildTheme(mode))
    return
  }
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => apply(buildTheme(mode)))
    })
  })
}

export function useAdminChartTheme() {
  const siteTheme = useAppTheme()
  const chartTheme = ref<AdminChartTheme>(
    fallbackForMode(import.meta.client ? siteTheme.resolvedTheme.value : 'light'),
  )
  const themeKey = ref(0)

  function refresh() {
    scheduleThemeRead(siteTheme.resolvedTheme.value, (theme) => {
      chartTheme.value = theme
      themeKey.value++
    })
  }

  if (import.meta.client) {
    watch(
      () => siteTheme.resolvedTheme.value,
      () => refresh(),
      { immediate: true },
    )

    let motionMq: MediaQueryList | null = null
    let classObserver: MutationObserver | null = null

    onMounted(() => {
      motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
      motionMq.addEventListener('change', refresh)

      classObserver = new MutationObserver(() => refresh())
      classObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class'],
      })
    })

    onUnmounted(() => {
      motionMq?.removeEventListener('change', refresh)
      classObserver?.disconnect()
    })
  }

  const baseTooltip = computed(() => ({
    backgroundColor: chartTheme.value.tooltipBg,
    borderColor: chartTheme.value.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: chartTheme.value.text, fontSize: 12 },
  }))

  const baseTextStyle = computed(() => ({
    color: chartTheme.value.text,
    fontFamily: 'inherit',
  }))

  const baseAnimation = computed(() =>
    chartTheme.value.animation
      ? { animationDuration: 800, animationEasing: 'cubicOut' as const }
      : { animation: false, animationDuration: 0 },
  )

  return {
    chartTheme,
    themeKey,
    refresh,
    baseTooltip,
    baseTextStyle,
    baseAnimation,
  }
}
