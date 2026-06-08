<script setup lang="ts">
import type { DashboardData } from "~/types/dashboard";

definePageMeta({
  layout: "admin",
});

const { data, pending, error, refresh } = await useFetch<DashboardData>(
  "/api/admin/dashboard",
);

function onTopLinkSelect(slug: string) {
  navigateTo(`/admin/posts/${slug}`);
}

const kpiItems = computed(() => {
  const d = data.value;
  if (!d) return [];
  const missing = d.wikilinks.by_resolve.missing_target;
  return [
    { label: "文章总数", value: d.posts.total, hint: "全库统计" },
    { label: "已发布", value: d.posts.by_status.published, hint: "全库统计" },
    { label: "草稿", value: d.posts.by_status.draft, hint: "全库统计" },
    { label: "有效双链", value: d.wikilinks.edges_ok, hint: "resolve=ok" },
    {
      label: "孤立笔记",
      value: d.wikilinks.orphan_count,
      hint: "无 ok 边连接",
    },
    { label: "断链", value: missing, hint: "未解析到目标文章" },
  ];
});
</script>

<template>
  <div class="admin-dashboard">
    <template v-if="pending">
      <section class="admin-card admin-card--pad">
        <ElSkeleton :rows="4" animated class="admin-dashboard__skeleton" />
      </section>
    </template>

    <template v-else-if="error">
      <section class="admin-card admin-card--pad">
        <p class="admin-dashboard__lead">加载统计失败：{{ error.message }}</p>
        <el-button type="primary" size="small" @click="refresh()"
          >重试</el-button
        >
      </section>
    </template>

    <template v-else-if="data">
      <div class="admin-dashboard__kpi-row">
        <DashboardStatCard
          v-for="(kpi, i) in kpiItems"
          :key="kpi.label"
          :label="kpi.label"
          :value="kpi.value"
          :hint="kpi.hint"
          :index="i"
        />
      </div>

      <div class="admin-dashboard__charts-row">
        <ClientOnly>
          <DashboardChartCard
            title="文章状态分布"
            subtitle="按发布状态统计"
            :index="6"
          >
            <DashboardChartsPostStatusChart :by-status="data.posts.by_status" />
          </DashboardChartCard>
          <DashboardChartCard
            title="发布 / 创建趋势"
            subtitle="近 90 天按日聚合"
            :index="7"
          >
            <DashboardChartsPostTrendChart :trend="data.posts.trend" />
          </DashboardChartCard>
          <template #fallback>
            <section
              class="admin-card admin-card--pad"
              style="min-height: 280px"
            >
              <ElSkeleton :rows="6" animated />
            </section>
            <section
              class="admin-card admin-card--pad"
              style="min-height: 280px"
            >
              <ElSkeleton :rows="6" animated />
            </section>
          </template>
        </ClientOnly>
      </div>

      <div
        class="admin-dashboard__charts-row admin-dashboard__charts-row--half"
      >
        <ClientOnly>
          <DashboardChartCard
            title="双链解析健康"
            subtitle="ok / 断链 / 歧义 / 自环"
            :index="8"
          >
            <DashboardChartsWikilinkHealthChart
              :by-resolve="data.wikilinks.by_resolve"
            />
          </DashboardChartCard>
          <DashboardChartCard
            title="链接类型"
            subtitle="普通链接 vs 嵌入块"
            :index="9"
          >
            <DashboardChartsWikilinkKindChart
              :by-kind="data.wikilinks.by_kind"
            />
          </DashboardChartCard>
          <template #fallback>
            <section
              class="admin-card admin-card--pad"
              style="min-height: 280px"
            >
              <ElSkeleton :rows="5" animated />
            </section>
            <section
              class="admin-card admin-card--pad"
              style="min-height: 280px"
            >
              <ElSkeleton :rows="5" animated />
            </section>
          </template>
        </ClientOnly>
      </div>

      <div
        class="admin-dashboard__charts-row admin-dashboard__charts-row--half"
      >
        <ClientOnly>
          <DashboardChartCard
            title="入链 Top 10"
            subtitle="点击条目可打开文章"
            :index="10"
          >
            <DashboardChartsTopLinksChart
              :items="data.wikilinks.top_inbound"
              direction="inbound"
              @select="onTopLinkSelect"
            />
          </DashboardChartCard>
          <DashboardChartCard
            title="出链 Top 10"
            subtitle="点击条目可打开文章"
            :index="11"
          >
            <DashboardChartsTopLinksChart
              :items="data.wikilinks.top_outbound"
              direction="outbound"
              @select="onTopLinkSelect"
            />
          </DashboardChartCard>
          <template #fallback>
            <section
              class="admin-card admin-card--pad"
              style="min-height: 280px"
            >
              <ElSkeleton :rows="5" animated />
            </section>
            <section
              class="admin-card admin-card--pad"
              style="min-height: 280px"
            >
              <ElSkeleton :rows="5" animated />
            </section>
          </template>
        </ClientOnly>
      </div>
    </template>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/styles/dashboard.less";
</style>
