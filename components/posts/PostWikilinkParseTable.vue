<script setup lang="ts">
import {
  wikilinkLinkKindLabel,
  wikilinkResolveStatusLabel,
  wikilinkResolveStatusTagType,
  type WikilinkParseTableRow,
} from '~/utils/wikilinkParseDisplay'

const props = withDefaults(
  defineProps<{
    rows: WikilinkParseTableRow[]
    loading?: boolean
    /** 是否显示「来源文件」列（批量导入用） */
    showSourcePath?: boolean
    maxHeight?: number | string
    /** 为 true 时不限制表格高度（避免卡片内出现滚动条） */
    unbounded?: boolean
    emptyText?: string
  }>(),
  {
    loading: false,
    showSourcePath: false,
    maxHeight: 240,
    unbounded: false,
    emptyText: '正文中未发现 [[双链]] 或 ![[嵌入]]',
  },
)

const tableMaxHeight = computed(() =>
  props.unbounded ? undefined : props.maxHeight,
)
</script>

<template>
  <div class="wikilink-parse-table">
    <el-skeleton v-if="loading" :rows="3" animated />
    <el-table
      v-else-if="rows.length"
      :data="rows"
      size="small"
      border
      stripe
      :max-height="tableMaxHeight"
      class="wikilink-parse-table__grid"
    >
      <el-table-column
        v-if="showSourcePath"
        prop="source_path"
        label="来源文件"
        min-width="120"
        show-overflow-tooltip
      />
      <el-table-column prop="raw_target" label="双链原文" min-width="110" show-overflow-tooltip />
      <el-table-column label="类型" width="64" align="center">
        <template #default="{ row }">
          {{ wikilinkLinkKindLabel(row.link_kind) }}
        </template>
      </el-table-column>
      <el-table-column label="是否命中" width="88" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="wikilinkResolveStatusTagType(row.resolve_status)">
            {{ wikilinkResolveStatusLabel(row.resolve_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="文章标题" min-width="110" show-overflow-tooltip>
        <template #default="{ row }">
          <template v-if="row.resolve_status === 'ok' && row.target_title">
            {{ row.target_title }}
          </template>
          <span v-else class="wikilink-parse-table__muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="目录路径" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <template v-if="row.resolve_status === 'ok' && row.target_directory_path">
            {{ row.target_directory_path }}
          </template>
          <span v-else class="wikilink-parse-table__muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="slug" min-width="100" show-overflow-tooltip>
        <template #default="{ row }">
          <template v-if="row.target_slug">{{ row.target_slug }}</template>
          <span v-else class="wikilink-parse-table__muted">—</span>
        </template>
      </el-table-column>
    </el-table>
    <p v-else class="wikilink-parse-table__empty">{{ emptyText }}</p>
  </div>
</template>

<style scoped lang="less">
.wikilink-parse-table {
  width: 100%;
}

.wikilink-parse-table__grid {
  width: 100%;
}

.wikilink-parse-table__empty {
  margin: 0;
  padding: 12px;
  font-size: 13px;
  color: var(--admin-muted);
  text-align: center;
  border: 1px dashed var(--admin-border);
  border-radius: 6px;
}

.wikilink-parse-table__muted {
  color: var(--admin-muted);
  opacity: 0.7;
}
</style>
