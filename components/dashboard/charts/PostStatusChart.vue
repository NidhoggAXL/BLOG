<script setup lang="ts">
import VChart from 'vue-echarts'
import type { DashboardData } from '~/types/dashboard'
import { registerDashboardEcharts } from '~/utils/echartsCore'

const props = defineProps<{
  byStatus: DashboardData['posts']['by_status']
}>()

registerDashboardEcharts()

const { chartTheme, themeKey, baseTooltip, baseTextStyle, baseAnimation } =
  useAdminChartTheme()

const option = computed(() => {
  void themeKey.value
  const t = chartTheme.value
  const data = [
    { name: '已发布', value: props.byStatus.published },
    { name: '草稿', value: props.byStatus.draft },
    { name: '已归档', value: props.byStatus.archived },
  ].filter((d) => d.value > 0)

  return {
    ...baseAnimation.value,
    textStyle: baseTextStyle.value,
    color: t.colors,
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
        radius: ['42%', '68%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        animationType: t.animation ? 'scale' : undefined,
        itemStyle: { borderRadius: 6, borderColor: t.tooltipBg, borderWidth: 2 },
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

const isEmpty = computed(
  () =>
    props.byStatus.published +
      props.byStatus.draft +
      props.byStatus.archived ===
    0,
)
</script>

<template>
  <div v-if="isEmpty" class="dashboard-chart-card__empty">暂无文章数据</div>
  <VChart
    v-else
    :key="themeKey"
    class="dashboard-chart-card__canvas"
    :option="option"
    autoresize
  />
</template>
