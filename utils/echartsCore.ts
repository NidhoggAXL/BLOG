import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

let registered = false

export function registerDashboardEcharts() {
  if (registered) return
  use([
    CanvasRenderer,
    PieChart,
    BarChart,
    LineChart,
    TooltipComponent,
    LegendComponent,
    GridComponent,
  ])
  registered = true
}
