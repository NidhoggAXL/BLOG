<script setup lang="ts">
import VChart from 'vue-echarts'
import type { DashboardTopLink } from '~/types/dashboard'
import { registerDashboardEcharts } from '~/utils/echartsCore'

const props = defineProps<{
  items: DashboardTopLink[]
  direction: 'inbound' | 'outbound'
}>()

const emit = defineEmits<{
  select: [slug: string]
}>()

registerDashboardEcharts()

const { chartTheme, themeKey, baseTooltip, baseTextStyle, baseAnimation } =
  useAdminChartTheme()

const option = computed(() => {
  void themeKey.value
  const t = chartTheme.value
  const sorted = [...props.items].reverse()
  const titles = sorted.map((i) =>
    i.title.length > 14 ? `${i.title.slice(0, 14)}…` : i.title,
  )
  const counts = sorted.map((i) => i.count)

  return {
    ...baseAnimation.value,
    textStyle: baseTextStyle.value,
    color: [t.colors[1]],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...baseTooltip.value,
      formatter: (params: { dataIndex?: number }[]) => {
        const idx = params[0]?.dataIndex
        if (idx == null || !sorted[idx]) return ''
        const item = sorted[idx]
        return `${item.title}<br/>${props.direction === 'inbound' ? '入链' : '出链'}：${item.count}`
      },
    },
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: t.grid, type: 'dashed' } },
      axisLabel: { color: t.muted, fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: titles,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: t.text, fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        data: counts,
      },
    ],
  }
})

function onChartClick(params: { dataIndex?: number }) {
  const sorted = [...props.items].reverse()
  const idx = params.dataIndex
  if (idx == null || !sorted[idx]) return
  emit('select', sorted[idx].slug)
}

const isEmpty = computed(() => props.items.length === 0)
</script>

<template>
  <div v-if="isEmpty" class="dashboard-chart-card__empty">暂无排行数据</div>
  <VChart
    v-else
    :key="themeKey"
    class="dashboard-chart-card__canvas"
    :option="option"
    autoresize
    @click="onChartClick"
  />
</template>
