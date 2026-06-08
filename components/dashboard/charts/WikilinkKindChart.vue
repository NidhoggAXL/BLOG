<script setup lang="ts">
import VChart from 'vue-echarts'
import type { DashboardData } from '~/types/dashboard'
import { registerDashboardEcharts } from '~/utils/echartsCore'

const props = defineProps<{
  byKind: DashboardData['wikilinks']['by_kind']
}>()

registerDashboardEcharts()

const { chartTheme, themeKey, baseTooltip, baseTextStyle, baseAnimation } =
  useAdminChartTheme()

const option = computed(() => {
  void themeKey.value
  const t = chartTheme.value
  const data = [
    { name: '普通链接', value: props.byKind.link },
    { name: '嵌入块', value: props.byKind.embed },
  ].filter((d) => d.value > 0)

  return {
    ...baseAnimation.value,
    textStyle: baseTextStyle.value,
    color: [t.colors[0], t.colors[2]],
    tooltip: {
      trigger: 'item',
      ...baseTooltip.value,
    },
    legend: {
      bottom: 0,
      textStyle: { color: t.muted, fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: '62%',
        center: ['50%', '45%'],
        animationType: t.animation ? 'scale' : undefined,
        label: {
          color: t.text,
          fontSize: 11,
          textBorderColor: 'transparent',
        },
        labelLine: { lineStyle: { color: t.muted } },
        data,
      },
    ],
  }
})

const isEmpty = computed(() => props.byKind.link + props.byKind.embed === 0)
</script>

<template>
  <div v-if="isEmpty" class="dashboard-chart-card__empty">无双链记录</div>
  <VChart
    v-else
    :key="themeKey"
    class="dashboard-chart-card__canvas"
    :option="option"
    autoresize
  />
</template>
