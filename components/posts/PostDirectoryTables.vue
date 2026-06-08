<script setup lang="ts">
import type { PostDirectorySection } from '~/composables/buildPostDirectorySections'
import type { PostListItem } from '~/types/post'

defineOptions({ name: 'PostDirectoryTables' })

const props = defineProps<{
  sections: PostDirectorySection[]
  loading?: boolean
  filterQuery?: string
}>()

const router = useRouter()

function matchQuery(p: PostListItem, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return (
    p.title.toLowerCase().includes(needle) ||
    p.slug.toLowerCase().includes(needle)
  )
}

const visibleSections = computed(() => {
  const q = props.filterQuery ?? ''
  if (!q.trim()) return props.sections
  return props.sections
    .map((sec) => ({
      ...sec,
      posts: sec.posts.filter((p) => matchQuery(p, q)),
    }))
    .filter((sec) => sec.posts.length > 0)
})

const totalVisiblePosts = computed(() =>
  visibleSections.value.reduce((n, s) => n + s.posts.length, 0),
)

function statusLabel(status: PostListItem['status']) {
  if (status === 'published') return '已发布'
  if (status === 'archived') return '已归档'
  return '草稿'
}

function statusTagType(status: PostListItem['status']) {
  if (status === 'published') return 'success'
  if (status === 'archived') return 'info'
  return 'warning'
}

function openPost(row: PostListItem) {
  router.push(`/admin/posts/${encodeURIComponent(row.slug)}`)
}
</script>

<template>
  <div class="post-dir-tables" :class="{ 'post-dir-tables--loading': loading }">
    <p v-if="!loading && !sections.length" class="post-dir-tables__empty">
      暂无目录。请先在「文库目录」创建文件夹，或通过导入写入文章。
    </p>
    <p
      v-else-if="!loading && sections.length && !visibleSections.length"
      class="post-dir-tables__empty"
    >
      没有匹配「{{ filterQuery }}」的文章。
    </p>

    <template v-else>
      <p v-if="filterQuery?.trim()" class="post-dir-tables__filter-hint">
        筛选结果：{{ totalVisiblePosts }} 篇文章
      </p>

      <section
        v-for="sec in visibleSections"
        :key="sec.id"
        class="post-dir-section"
        :aria-labelledby="`dir-heading-${sec.id}`"
      >
        <header class="post-dir-section__head">
          <div class="post-dir-section__titles">
            <h2 :id="`dir-heading-${sec.id}`" class="post-dir-section__name">
              {{ sec.name }}
            </h2>
            <span v-if="sec.pathLabel !== sec.name" class="post-dir-section__path">
              {{ sec.pathLabel }}
            </span>
          </div>
          <code class="post-dir-section__slug">{{ sec.slug }}</code>
          <span class="post-dir-section__count">{{ sec.posts.length }} 篇</span>
        </header>

        <el-table
          :data="sec.posts"
          class="post-dir-section__table"
          stripe
          :show-header="true"
          row-key="id"
          empty-text="该目录下暂无文章"
          @row-click="(row: PostListItem) => openPost(row)"
        >
          <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="post-dir-section__title-cell">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="slug" label="slug" width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <code class="post-dir-section__slug-cell">{{ row.slug }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="statusTagType(row.status)" effect="plain">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="172" align="right" />
        </el-table>
      </section>
    </template>
  </div>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.post-dir-tables {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.post-dir-tables--loading {
  min-height: 160px;
}

.post-dir-tables__empty {
  margin: 0;
  padding: 32px 20px;
  text-align: center;
  font-size: 14px;
  color: var(--admin-muted);
  border: 1px dashed var(--admin-border);
  border-radius: @radius-lg;
}

.post-dir-tables__filter-hint {
  margin: 0 0 -8px;
  font-size: 13px;
  color: var(--admin-muted);
}

.post-dir-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px 14px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--admin-border);
}

.post-dir-section__titles {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.post-dir-section__name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--admin-text);
  line-height: 1.3;
}

.post-dir-section__path {
  font-size: 13px;
  color: var(--admin-muted);
}

.post-dir-section__slug {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: @radius-sm;
  background: var(--admin-nav-hover);
  border: 1px solid var(--admin-border);
  color: var(--admin-muted);
  font-family: ui-monospace, monospace;
}

.post-dir-section__count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--admin-muted);
  white-space: nowrap;
}

.post-dir-section__table {
  width: 100%;
  cursor: pointer;
}

.post-dir-section__table :deep(.el-table__row:hover) {
  background: var(--admin-nav-hover) !important;
}

.post-dir-section__title-cell {
  font-weight: 500;
  color: var(--admin-text);
}

.post-dir-section__slug-cell {
  font-size: 12px;
  color: var(--admin-muted);
}
</style>
