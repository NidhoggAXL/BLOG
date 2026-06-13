<script setup lang="ts">
import type { DirectoryTreeNode } from '~/composables/buildDirectoryTreeSelect'
import type { DirectoryRow } from '~/types/directory'
import type { WikilinkLinkOption } from '~/composables/useWikilinkTextareaAutocomplete'
import { collectResolvedWikilinkSlugs } from '~/utils/collectResolvedWikilinkSlugs'
import {
  buildManualPostPathSlug,
  directoryPathSlugFromFlat,
} from '~/utils/postPathSlug'
import {
  enrichWikilinkParseRows,
  type WikilinkParseTableRow,
} from '~/utils/wikilinkParseDisplay'

const props = withDefaults(
  defineProps<{
    treeSelectData: DirectoryTreeNode[]
    flatDirs?: DirectoryRow[]
    linkOptions: WikilinkLinkOption[]
    markdownBody?: string
    initialTitle?: string
    initialDirectoryId?: number
    initialStatus?: 'draft' | 'published' | 'archived'
    initialWikilinkSlugs?: string[]
  }>(),
  { flatDirs: () => [] },
)

const form = reactive({
  title: '',
  directory_id: 0 as number,
  status: 'draft' as 'draft' | 'published' | 'archived',
  wikilink_slugs: [] as string[],
})

const autoParseWikilinks = ref(true)
const parsingWikilinks = ref(false)
const wikilinkParseRows = ref<WikilinkParseTableRow[]>([])
const parseSummary = ref<{ total: number; hit: number } | null>(null)

const directoryPathSlug = computed(() => {
  const dirId = form.directory_id === 0 ? null : form.directory_id
  return directoryPathSlugFromFlat(props.flatDirs, dirId)
})

const slugPreview = computed(
  () => buildManualPostPathSlug(directoryPathSlug.value, form.title).slug,
)

function resetFromProps() {
  form.title = props.initialTitle ?? ''
  form.directory_id = props.initialDirectoryId ?? 0
  form.status = props.initialStatus ?? 'draft'
  form.wikilink_slugs = [...(props.initialWikilinkSlugs ?? [])]
  autoParseWikilinks.value = true
  wikilinkParseRows.value = []
  parseSummary.value = null
  void refreshWikilinkAutoParse()
}

watch(
  () => [
    props.initialTitle,
    props.initialDirectoryId,
    props.initialStatus,
    props.initialWikilinkSlugs,
  ],
  () => resetFromProps(),
  { immediate: true },
)

watch(autoParseWikilinks, (on) => {
  if (on) void refreshWikilinkAutoParse()
  else {
    wikilinkParseRows.value = []
    parseSummary.value = null
  }
})

async function refreshWikilinkAutoParse() {
  if (!autoParseWikilinks.value) return

  const md = props.markdownBody?.trim()
  if (!md) {
    wikilinkParseRows.value = []
    parseSummary.value = { total: 0, hit: 0 }
    return
  }

  parsingWikilinks.value = true
  try {
    const links = await parseWikilinksFromMarkdown(md)
    wikilinkParseRows.value = enrichWikilinkParseRows(links, props.linkOptions)
    const hits = collectResolvedWikilinkSlugs(links)
    mergeWikilinkSlugs(hits)
    parseSummary.value = { total: links.length, hit: hits.length }
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    ElMessage.warning(err?.data?.statusMessage || err?.message || '双链自动解析失败')
    wikilinkParseRows.value = []
    parseSummary.value = null
  } finally {
    parsingWikilinks.value = false
  }
}

function mergeWikilinkSlugs(slugs: string[]) {
  const merged = new Set(form.wikilink_slugs.map((s) => s.toLowerCase()))
  for (const s of slugs) {
    const t = s.trim()
    if (!t || merged.has(t.toLowerCase())) continue
    form.wikilink_slugs.push(t)
    merged.add(t.toLowerCase())
  }
}

function buildPayload():
  | {
      title: string
      slug: string
      directory_id: number
      status: 'draft' | 'published' | 'archived'
      wikilink_slugs: string[]
    }
  | null {
  if (!form.title.trim()) {
    ElMessage.warning('请填写标题')
    return null
  }
  const { title, slug } = buildManualPostPathSlug(directoryPathSlug.value, form.title)
  return {
    title,
    slug,
    directory_id: form.directory_id,
    status: form.status,
    wikilink_slugs: form.wikilink_slugs,
  }
}

defineExpose({ buildPayload, refreshWikilinkAutoParse, mergeWikilinkSlugs })
</script>

<template>
  <el-form label-position="top" class="post-save-meta-form" @submit.prevent>
    <el-form-item label="标题" required>
      <el-input
        v-model="form.title"
        maxlength="191"
        show-word-limit
        placeholder="与 Obsidian 文件名一致（即路径最后一段）"
      />
    </el-form-item>

    <p class="post-save-meta-form__slug-preview">
      路径 slug：<code>{{ slugPreview || '（空）' }}</code>
      <span v-if="directoryPathSlug" class="post-save-meta-form__slug-hint">
        （{{ directoryPathSlug }}/标题）
      </span>
      <span v-else class="post-save-meta-form__slug-hint">（未归类：slug 即标题）</span>
    </p>

    <el-form-item label="所属目录" required>
      <el-tree-select
        v-model="form.directory_id"
        :data="treeSelectData"
        check-strictly
        default-expand-all
        :render-after-expand="false"
        placeholder="选择文件夹；「未归类」表示不挂目录"
        style="width: 100%"
      />
    </el-form-item>

    <el-form-item label="状态">
      <el-radio-group v-model="form.status">
        <el-radio-button value="draft">草稿</el-radio-button>
        <el-radio-button value="published">已发布</el-radio-button>
        <el-radio-button value="archived">已归档</el-radio-button>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="双链">
      <div class="post-save-meta-form__wikilink-head">
        <el-switch
          v-model="autoParseWikilinks"
          active-text="自动解析正文双链并命中库内文章"
          :loading="parsingWikilinks"
        />
        <el-button
          v-if="autoParseWikilinks"
          type="primary"
          link
          :loading="parsingWikilinks"
          @click="refreshWikilinkAutoParse"
        >
          重新解析
        </el-button>
      </div>

      <template v-if="autoParseWikilinks">
        <p v-if="parseSummary" class="post-save-meta-form__hint">
          共解析 {{ parseSummary.total }} 处双链，命中 {{ parseSummary.hit }} 篇（已合并到下方勾选列表）
        </p>
        <PostsPostWikilinkParseTable
          :rows="wikilinkParseRows"
          :loading="parsingWikilinks"
          :max-height="260"
        />
      </template>

      <el-select
        v-model="form.wikilink_slugs"
        multiple
        filterable
        collapse-tags
        collapse-tags-tooltip
        placeholder="搜索并多选要链接的文章；也可在正文中写 [[slug]]"
        class="post-save-meta-form__wikilink-select"
      >
        <el-option
          v-for="o in linkOptions"
          :key="o.value"
          :label="o.directoryPath ? `${o.label} · ${o.directoryPath}` : o.label"
          :value="o.value"
        >
          <div class="post-save-meta-form__link-opt">
            <span class="post-save-meta-form__link-opt-title">{{ o.label }}</span>
            <span v-if="o.directoryPath" class="post-save-meta-form__link-opt-path">{{
              o.directoryPath
            }}</span>
          </div>
        </el-option>
      </el-select>
    </el-form-item>
  </el-form>
</template>

<style scoped lang="less">
.post-save-meta-form {
  width: 100%;
}

.post-save-meta-form__slug-preview {
  margin: -8px 0 16px;
  font-size: 13px;
  color: var(--admin-muted);
}

.post-save-meta-form__slug-preview code {
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--admin-nav-hover);
}

.post-save-meta-form__slug-hint {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.85;
}

.post-save-meta-form__wikilink-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 8px;
}

.post-save-meta-form__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--admin-muted);
  line-height: 1.45;
}

.post-save-meta-form__wikilink-select {
  width: 100%;
  margin-top: 12px;
}

.post-save-meta-form__link-opt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.35;
  max-width: 100%;
}

.post-save-meta-form__link-opt-title {
  font-weight: 600;
  font-size: 14px;
}

.post-save-meta-form__link-opt-path {
  font-size: 12px;
  color: var(--admin-muted);
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
