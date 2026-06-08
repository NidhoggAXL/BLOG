<script setup lang="ts">
import VChart from 'vue-echarts'
import type { DashboardData } from '~/types/dashboard'
import { registerDashboardEcharts } from '~/utils/echartsCore'

const props = defineProps<{
  byResolve: DashboardData['wikilinks']['by_resolve']
}>()

registerDashboardEcharts()

const { chartTheme, themeKey, baseTooltip, baseTextStyle, baseAnimation } =
  useAdminChartTheme()

const labels: Record<string, string> = {
  ok: '正常',
  missing_target: '断链',
  ambiguous: '歧义',
  self_loop: '自环',
}

const option = computed(() => {
  void themeKey.value
  const t = chartTheme.value
  const keys = ['ok', 'missing_target', 'ambiguous', 'self_loop'] as const
  const categories = keys.map((k) => labels[k])
  const values = keys.map((k) => props.byResolve[k])

  return {
    ...baseAnimation.value,
    textStyle: baseTextStyle.value,
    color: t.colors,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...baseTooltip.value,
    },
    grid: { left: 48, right: 16, top: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.muted, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: t.grid, type: 'dashed' } },
      axisLabel: { color: t.muted, fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        barWidth: '48%',
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: t.colors[i % t.colors.length] },
        })),
      },
    ],
  }
})

const isEmpty = computed(() =>
  Object.values(props.byResolve).every((v) => v === 0),
)
</script>

<template>
  <div v-if="isEmpty" class="dashboard-chart-card__empty">无双链数据</div>
  <VChart
    v-else
    :key="themeKey"
    class="dashboard-chart-card__canvas"
    :option="option"
    autoresize
  />
</template>
