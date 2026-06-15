<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import type { PostAlias } from '~/types/post-alias'
import { fetchErrorMessage } from '~/utils/fetchErrorMessage'

const props = defineProps<{
  /** 当前文章的 slug，用于调用别名 API */
  postSlug: string
  /** 初始别名（可选，来自文章详情） */
  initialAliases?: PostAlias[]
}>()

const aliases = ref<PostAlias[]>([...(props.initialAliases ?? [])])
const tableMissing = ref(false)
const loading = ref(false)
const adding = ref(false)
const newAlias = ref('')

async function loadAliases() {
  if (!props.postSlug.trim()) return
  loading.value = true
  try {
    const res = await $fetch<{ aliases: PostAlias[]; table_missing?: boolean }>(
      `/api/posts/${encodeURIComponent(props.postSlug)}/aliases`,
    )
    aliases.value = res.aliases ?? []
    tableMissing.value = res.table_missing === true
  } catch (e: unknown) {
    ElMessage.error(fetchErrorMessage(e, '加载别名失败'))
  } finally {
    loading.value = false
  }
}

watch(
  () => props.postSlug,
  () => {
    void loadAliases()
  },
  { immediate: true },
)

async function onAddAlias() {
  const alias = newAlias.value.trim()
  if (!alias) {
    ElMessage.warning('请输入别名')
    return
  }
  adding.value = true
  try {
    const res = await $fetch<{ alias: PostAlias }>(
      `/api/posts/${encodeURIComponent(props.postSlug)}/aliases`,
      { method: 'POST', body: { alias } },
    )
    if (!aliases.value.some((a) => a.id === res.alias.id)) {
      aliases.value = [...aliases.value, res.alias].sort((a, b) =>
        a.alias.localeCompare(b.alias),
      )
    }
    newAlias.value = ''
    ElMessage.success('别名已添加')
  } catch (e: unknown) {
    ElMessage.error(fetchErrorMessage(e, '添加别名失败'))
  } finally {
    adding.value = false
  }
}

async function onRemoveAlias(row: PostAlias) {
  try {
    await ElMessageBox.confirm(`确定删除别名「${row.alias}」？`, '删除别名', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  try {
    await $fetch(
      `/api/posts/${encodeURIComponent(props.postSlug)}/aliases/${row.id}`,
      { method: 'DELETE' },
    )
    aliases.value = aliases.value.filter((a) => a.id !== row.id)
    ElMessage.success('已删除')
  } catch (e: unknown) {
    ElMessage.error(fetchErrorMessage(e, '删除失败'))
  }
}
</script>

<template>
  <div class="post-alias-manager">
    <p class="post-alias-manager__hint">
      别名用于双链解析时的备用匹配名（全局唯一），与正文中的
      <code>[[显示名|…]]</code> 无关。改名后旧 slug 会自动写入别名。
    </p>

    <el-alert
      v-if="tableMissing"
      type="warning"
      :closable="false"
      show-icon
      title="未创建 post_aliases 表"
      class="post-alias-manager__alert"
    >
      请执行 db/04-schema-post-aliases.sql 后刷新。
    </el-alert>

    <el-skeleton v-if="loading && !aliases.length" :rows="2" animated />

    <ul v-else-if="aliases.length" class="post-alias-manager__list">
      <li v-for="row in aliases" :key="row.id" class="post-alias-manager__item">
        <code>{{ row.alias }}</code>
        <el-button type="danger" link size="small" @click="onRemoveAlias(row)">
          删除
        </el-button>
      </li>
    </ul>
    <p v-else-if="!tableMissing" class="post-alias-manager__empty">暂无别名</p>

    <div v-if="!tableMissing" class="post-alias-manager__add">
      <el-input
        v-model="newAlias"
        maxlength="191"
        placeholder="输入备用匹配名，如旧 slug 或 Obsidian 文件名"
        @keyup.enter="onAddAlias"
      />
      <el-button type="primary" :icon="Plus" :loading="adding" @click="onAddAlias">
        添加
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="less">
.post-alias-manager {
  width: 100%;
}

.post-alias-manager__hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--admin-muted);
}

.post-alias-manager__hint code {
  font-size: 11px;
}

.post-alias-manager__alert {
  margin-bottom: 10px;
}

.post-alias-manager__list {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
}

.post-alias-manager__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--admin-nav-hover, rgba(0, 0, 0, 0.04));
  margin-bottom: 4px;
}

.post-alias-manager__empty {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--admin-muted);
}

.post-alias-manager__add {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
