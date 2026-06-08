<script setup lang="ts">
import VChart from 'vue-echarts'
import type { DashboardPostTrendPoint } from '~/types/dashboard'
import { registerDashboardEcharts } from '~/utils/echartsCore'

const props = defineProps<{
  trend: DashboardPostTrendPoint[]
}>()

registerDashboardEcharts()

const { chartTheme, themeKey, baseTooltip, baseTextStyle, baseAnimation } =
  useAdminChartTheme()

const option = computed(() => {
  void themeKey.value
  const t = chartTheme.value
  const dates = props.trend.map((p) => p.date.slice(5))
  const counts = props.trend.map((p) => p.count)

  return {
    ...baseAnimation.value,
    textStyle: baseTextStyle.value,
    color: [t.colors[0]],
    tooltip: {
      trigger: 'axis',
      ...baseTooltip.value,
    },
    grid: { left: 40, right: 16, top: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.muted, fontSize: 10, interval: Math.floor(dates.length / 8) },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: t.grid, type: 'dashed' } },
      axisLabel: { color: t.muted, fontSize: 10 },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: t.colors[0] + '44' },
              { offset: 1, color: t.colors[0] + '08' },
            ],
          },
        },
        data: counts,
      },
    ],
  }
})

const isEmpty = computed(() => props.trend.every((p) => p.count === 0))
</script>

<template>
  <div v-if="isEmpty" class="dashboard-chart-card__empty">近 90 天暂无发布/创建记录</div>
  <VChart
    v-else
    :key="themeKey"
    class="dashboard-chart-card__canvas"
    :option="option"
    autoresize
  />
</template>
