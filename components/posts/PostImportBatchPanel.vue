<script setup lang="ts">
import { ArrowLeft, Connection, FolderOpened, View, Hide } from '@element-plus/icons-vue'
import PostImportSharedFields from '~/components/posts/PostImportSharedFields.vue'
import { IMPORT_BATCH_MAX_FILES } from '~/constants/post-import'
import type { ImportMdFile } from '~/composables/parseImportArchive'
import {
  buildArchiveDepthOptions,
  buildImportDirPreviewTree,
  buildImportDirPreviewTopLevel,
} from '~/composables/parseImportArchive'
import type { WikilinkParseLink } from '~/types/wikilink'
import type { ImportBatchResult } from '~/types/import'
import {
  enrichWikilinkParseRows,
  type WikilinkParseTableRow,
} from '~/utils/wikilinkParseDisplay'
import {
  collectTopLevelImportDirectoryNames,
  detectTopLevelDirectoryConflicts,
  formatTopLevelDirConflictDetail,
  IMPORT_TOP_DIR_CONFLICT_MESSAGE,
} from '~/utils/importDirectoryConflict'
import { fetchErrorMessage } from '~/utils/fetchErrorMessage'
import { collectResolvedWikilinkSlugs } from '~/utils/collectResolvedWikilinkSlugs'
import PostWikilinkParseTable from '~/components/posts/PostWikilinkParseTable.vue'
import PostAiLinkRecommendPanel from '~/components/posts/PostAiLinkRecommendPanel.vue'

const props = defineProps<{
  files: ImportMdFile[]
  sourceName: string
}>()

const emit = defineEmits<{
  done: [ImportBatchResult]
  cancel: []
}>()

const {
  directoryTreeOnly,
  flatDirs,
  linkOptions,
  loading: metaLoading,
  loadMeta,
} = usePostCreateMeta()

const parentMode = ref<'zip-as-root' | 'under-parent'>('zip-as-root')
const parentDirectoryId = ref<number | undefined>(undefined)
const archiveDepth = ref(0)
const dirPreviewExpanded = ref(false)
const wikilinkSlugs = ref<string[]>([])
const status = ref<'draft' | 'published' | 'archived'>('draft')
const autoParseWikilinks = ref(true)
const parsing = ref(false)
const importing = ref(false)
const wikilinkRows = ref<WikilinkParseTableRow[]>([])
const wikilinkParseTried = ref(false)
const wikilinkParseError = ref<string | null>(null)

const runtimeConfig = useRuntimeConfig()
const aiEnabled = computed(() => runtimeConfig.public.aiEnabled !== false)

const aiSelectedPath = ref('')
const aiSlugsByPath = ref<Record<string, string[]>>({})

const selectedAiFile = computed(() =>
  props.files.find((f) => f.path === aiSelectedPath.value),
)

const aiAdoptedFileCount = computed(
  () => Object.values(aiSlugsByPath.value).filter((slugs) => slugs.length).length,
)

const aiFileSelectOptions = computed(() =>
  props.files.map((f) => {
    const adopted = aiSlugsByPath.value[f.path]?.length ?? 0
    return {
      value: f.path,
      label: adopted ? `${f.path}（已采纳 ${adopted} 条）` : f.path,
    }
  }),
)

const aiExcludeSlugs = computed(() => {
  const slugs = props.files.map((f) => f.slug).filter(Boolean)
  const current = selectedAiFile.value?.slug
  if (!current) return slugs
  return slugs.filter((s) => s.toLowerCase() !== current.toLowerCase())
})

/** 避免模板里 `?? []` 每次渲染新引用，触发子组件 watch 清空推荐结果 */
const EMPTY_ADOPTED_SLUGS: string[] = []
const aiCurrentAdoptedSlugs = computed(
  () => aiSlugsByPath.value[aiSelectedPath.value] ?? EMPTY_ADOPTED_SLUGS,
)

const wikilinkParseSummary = computed(() => {
  if (!wikilinkRows.value.length) return null
  const hit = wikilinkRows.value.filter((r) => r.resolve_status === 'ok').length
  return { total: wikilinkRows.value.length, hit }
})

const depthOptions = computed(() => buildArchiveDepthOptions(props.files))
const previewTree = computed(() =>
  buildImportDirPreviewTree(props.files, archiveDepth.value),
)

const displayPreviewTree = computed(() =>
  dirPreviewExpanded.value
    ? previewTree.value
    : buildImportDirPreviewTopLevel(props.files, archiveDepth.value),
)

const dirPreviewEmptyText = computed(() => {
  if (displayPreviewTree.value.length) return ''
  if (dirPreviewExpanded.value) {
    return parentMode.value === 'under-parent'
      ? '文件将直接挂在所选父目录下'
      : '文件将挂在文库根目录（无中间文件夹）'
  }
  return '压缩包内无一级目录（文件均在根目录）'
})

const importParentDirectoryId = computed<number | null>(() =>
  parentMode.value === 'zip-as-root' ? null : (parentDirectoryId.value ?? null),
)

const batchOverLimit = computed(
  () => props.files.length > IMPORT_BATCH_MAX_FILES,
)

const topLevelDirConflicts = computed(() => {
  if (!props.files.length) return []
  if (parentMode.value === 'under-parent' && !parentDirectoryId.value) return []
  const names = collectTopLevelImportDirectoryNames(
    props.files,
    archiveDepth.value,
  )
  return detectTopLevelDirectoryConflicts(
    flatDirs.value,
    names,
    importParentDirectoryId.value,
  )
})

watch(
  () => props.files,
  (files) => {
    const opts = buildArchiveDepthOptions(files)
    if (opts.length && !opts.some((o) => o.depth === archiveDepth.value)) {
      archiveDepth.value = opts[0]!.depth
    }
    if (files.length && !files.some((f) => f.path === aiSelectedPath.value)) {
      aiSelectedPath.value = files[0]!.path
    }
    if (!files.length) {
      aiSelectedPath.value = ''
      aiSlugsByPath.value = {}
    }
  },
  { immediate: true },
)

watch(autoParseWikilinks, (on) => {
  if (on && props.files.length && !metaLoading.value) {
    void parseAllWikilinks({ silent: true })
  } else if (!on) {
    wikilinkRows.value = []
    wikilinkParseTried.value = false
    wikilinkParseError.value = null
  }
})

onMounted(async () => {
  await loadMeta().catch(() => {})
  if (props.files.length && autoParseWikilinks.value) {
    await parseAllWikilinks({ silent: true })
  }
})

function mergeWikilinkHitsIntoSelection(hits: string[]) {
  const seen = new Set(wikilinkSlugs.value.map((s) => s.toLowerCase()))
  for (const s of hits) {
    if (!seen.has(s.toLowerCase())) {
      wikilinkSlugs.value.push(s)
      seen.add(s.toLowerCase())
    }
  }
}

function onAiRecommendComplete(payload: { adoptedSlugs: string[] }) {
  const path = aiSelectedPath.value
  if (!path) return
  const next = { ...aiSlugsByPath.value }
  if (payload.adoptedSlugs.length) {
    next[path] = [...payload.adoptedSlugs]
  } else {
    delete next[path]
  }
  aiSlugsByPath.value = next
}

function onAiRecommendReset() {
  const path = aiSelectedPath.value
  if (!path) return
  const next = { ...aiSlugsByPath.value }
  delete next[path]
  aiSlugsByPath.value = next
}

function buildWikilinkSlugsByPathPayload(): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const [path, slugs] of Object.entries(aiSlugsByPath.value)) {
    const cleaned = slugs.map((s) => s.trim()).filter(Boolean)
    if (cleaned.length) out[path] = cleaned
  }
  return out
}

async function parseAllWikilinks(options?: {
  mergeIntoSelection?: boolean
  silent?: boolean
}) {
  if (!props.files.length) return
  parsing.value = true
  wikilinkParseError.value = null
  if (!options?.silent) wikilinkRows.value = []
  try {
    const merged: WikilinkParseTableRow[] = []
    const pending = props.files.map((z) => ({
      slug: z.slug,
      title: z.title,
      stem: z.fileName.replace(/\.(md|markdown|mdown|mkd)$/i, '').trim(),
    }))
    for (const f of props.files) {
      const res = await $fetch<{ links: WikilinkParseLink[] }>(
        '/api/wikilinks/parse',
        {
          method: 'POST',
          body: {
            markdown: f.body,
            pending_slugs: pending,
          },
        },
      )
      for (const link of res.links) {
        merged.push({ ...link, source_path: f.path })
      }
    }
    wikilinkRows.value = enrichWikilinkParseRows(merged, linkOptions.value)
    wikilinkParseTried.value = true
    if (options?.mergeIntoSelection) {
      mergeWikilinkHitsIntoSelection(collectResolvedWikilinkSlugs(merged))
    }
    if (options?.silent) return
    if (!merged.length) {
      ElMessage.info('所有正文中均未发现 [[双链]] 或 ![[嵌入]]')
    } else {
      const hitCount = collectResolvedWikilinkSlugs(merged).length
      ElMessage.success(
        `共解析 ${merged.length} 处维基链接${hitCount ? `，命中 ${hitCount} 个目标` : ''}`,
      )
    }
  } catch (e: unknown) {
    wikilinkParseTried.value = true
    wikilinkParseError.value = fetchErrorMessage(e, '解析失败')
    if (!options?.silent) {
      ElMessage.error(wikilinkParseError.value)
    }
  } finally {
    parsing.value = false
  }
}

async function submitBatch() {
  if (!props.files.length) return
  if (batchOverLimit.value) {
    ElMessage.warning(
      `当前 ${props.files.length} 个文件，超过单次上限 ${IMPORT_BATCH_MAX_FILES}，请拆分压缩包后分批导入`,
    )
    return
  }
  if (parentMode.value === 'under-parent' && !parentDirectoryId.value) {
    ElMessage.warning('请选择要挂接的父目录')
    return
  }
  if (topLevelDirConflicts.value.length) {
    await ElMessageBox.alert(
      formatTopLevelDirConflictDetail(topLevelDirConflicts.value),
      '目录冲突',
      {
        type: 'warning',
        confirmButtonText: '知道了',
      },
    )
    return
  }
  importing.value = true
  try {
    if (autoParseWikilinks.value && !wikilinkRows.value.length) {
      await parseAllWikilinks({ silent: true })
    }
    const wikilinkSlugsByPath = buildWikilinkSlugsByPathPayload()
    const res = await $fetch<ImportBatchResult>('/api/import/batch', {
      method: 'POST',
      body: {
        parent_directory_id:
          parentMode.value === 'zip-as-root'
            ? null
            : (parentDirectoryId.value ?? null),
        archive_depth: archiveDepth.value,
        status: status.value,
        wikilink_target_slugs: wikilinkSlugs.value,
        wikilink_slugs_by_path: wikilinkSlugsByPath,
        files: props.files.map((f) => ({
          path: f.path,
          title: f.title,
          body: f.body,
          slug: f.slug,
        })),
      },
    })
    for (const w of res.warnings ?? []) {
      ElMessage.warning(w)
    }
    if (!res.posts_created) {
      ElMessage.error('导入未创建任何文章，请检查压缩包路径与「目录层级起点」')
      return
    }
    ElMessage.success(
      `导入完成：新建 ${res.posts_created} 篇文章、${res.directories_created} 个目录`,
    )
    emit('done', res)
  } catch (e: unknown) {
    const err = e as { statusCode?: number }
    const msg = fetchErrorMessage(e, '导入失败')
    if (
      err?.statusCode === 409 &&
      msg.includes(IMPORT_TOP_DIR_CONFLICT_MESSAGE)
    ) {
      await ElMessageBox.alert(msg, '目录冲突', {
        type: 'warning',
        confirmButtonText: '知道了',
      })
    } else {
      ElMessage.error(msg)
    }
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="post-import-batch">
    <header class="post-import-batch__head">
      <div>
        <h1 class="post-import-batch__title">批量导入 Markdown</h1>
        <p class="post-import-batch__lead">
          来源：<strong>{{ sourceName }}</strong> · 共
          <strong>{{ files.length }}</strong>
          个文件（单次最多 {{ IMPORT_BATCH_MAX_FILES }}）。确认目录层级与双链后执行导入。
        </p>
      </div>
      <div class="post-import-batch__actions">
        <el-button :icon="ArrowLeft" @click="emit('cancel')">返回</el-button>
        <el-button
          type="primary"
          :loading="importing"
          :disabled="
            batchOverLimit ||
            topLevelDirConflicts.length > 0 ||
            (parentMode === 'under-parent' && !parentDirectoryId) ||
            metaLoading
          "
          :icon="FolderOpened"
          @click="submitBatch"
        >
          开始导入
        </el-button>
      </div>
    </header>

    <el-skeleton v-if="metaLoading" :rows="8" animated class="post-import-batch__skeleton" />

    <div v-else class="post-import-batch__body">
      <div class="post-import-batch__workspace">
        <section class="post-import-batch__primary compose-panel-card">
          <header class="compose-panel-card__head">
            <h2 class="compose-panel-card__title">导入设置</h2>
          </header>
          <div class="compose-panel-card__content post-import-batch__primary-content">
            <el-form label-position="top" class="post-import-batch__form">
      <el-alert
        v-if="batchOverLimit"
        type="error"
        :closable="false"
        show-icon
        class="post-import-batch__alert"
        :title="`文件过多（${files.length} / ${IMPORT_BATCH_MAX_FILES}）`"
      >
        <p>
          压缩包内 Markdown 数量超过单次导入上限。请按文件夹拆成多个 .zip
          后分批导入，或先删除不需要的笔记再试。
        </p>
      </el-alert>

      <el-alert
        v-if="topLevelDirConflicts.length"
        type="warning"
        :closable="false"
        show-icon
        class="post-import-batch__alert"
        :title="IMPORT_TOP_DIR_CONFLICT_MESSAGE"
      >
        <p
          v-for="c in topLevelDirConflicts"
          :key="c.slug"
          class="post-import-batch__conflict-line"
        >
          导入目录「{{ c.importName }}」与已有「{{ c.existingName }}」冲突
        </p>
      </el-alert>

      <el-form-item label="父级目录">
        <el-radio-group v-model="parentMode" class="parent-mode-radio">
          <el-radio value="zip-as-root" class="parent-mode-radio__item">
            <span>不指定父目录</span>
            <span class="parent-mode-radio__desc">
              压缩包内文件夹将直接作为文库根目录（与文章「未归类」无关）
            </span>
          </el-radio>
          <el-radio value="under-parent" class="parent-mode-radio__item">
            <span>挂到已有目录下</span>
            <span class="parent-mode-radio__desc">
              在所选父目录内，再按下方「目录层级起点」创建子文件夹
            </span>
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item
        v-if="parentMode === 'under-parent'"
        label="选择父目录"
        required
      >
        <el-tree-select
          v-model="parentDirectoryId"
          :data="directoryTreeOnly"
          node-key="value"
          :props="{ value: 'value', label: 'label', children: 'children' }"
          check-strictly
          default-expand-all
          :render-after-expand="false"
          placeholder="请选择文库中的父目录"
          style="width: 100%"
        />
        <p v-if="!directoryTreeOnly.length" class="post-import-batch__field-hint">
          文库中尚无目录。请先在「文库目录」创建文件夹，或改选「不指定父目录」。
        </p>
      </el-form-item>

      <el-form-item label="目录层级起点">
        <el-radio-group v-model="archiveDepth" class="depth-radio">
          <el-radio
            v-for="opt in depthOptions"
            :key="opt.depth"
            :value="opt.depth"
            class="depth-radio__item"
          >
            <span>{{ opt.label }}</span>
            <span v-if="opt.sampleDirs.length" class="depth-radio__samples">
              示例：{{ opt.sampleDirs.join('、')
              }}{{ opt.sampleDirs.length >= 5 ? '…' : '' }}
            </span>
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item>
        <template #label>
          <div class="tree-preview-label">
            <span>将创建的目录结构（预览）</span>
            <el-button
              link
              type="primary"
              size="small"
              :icon="dirPreviewExpanded ? Hide : View"
              @click="dirPreviewExpanded = !dirPreviewExpanded"
            >
              {{ dirPreviewExpanded ? '仅显示一级' : '显示全部' }}
            </el-button>
          </div>
        </template>
        <div class="tree-preview">
          <el-tree
            :key="dirPreviewExpanded ? 'full' : 'top'"
            :data="displayPreviewTree"
            :props="{ label: 'label', children: 'children' }"
            :default-expand-all="dirPreviewExpanded"
            :empty-text="dirPreviewEmptyText"
          />
        </div>
      </el-form-item>

      <PostImportSharedFields
        v-model:wikilink-slugs="wikilinkSlugs"
        v-model:status="status"
        v-model:auto-parse-wikilinks="autoParseWikilinks"
        :tree-select-data="directoryTreeOnly"
        :link-options="linkOptions"
        hide-parent-directory
      />

      <el-form-item label="双链解析">
        <div class="wikilink-parse-block">
          <div class="wikilink-parse-block__toolbar">
            <el-button
              :icon="Connection"
              :loading="parsing"
              @click="parseAllWikilinks({ mergeIntoSelection: true })"
            >
              解析全部正文中的双链
            </el-button>
            <span class="post-import-batch__hint-inline">
              不预览正文，仅汇总解析结果与是否命中。
            </span>
            <span
              v-if="wikilinkParseSummary"
              class="wikilink-parse-block__summary"
            >
              共 {{ wikilinkParseSummary.total }} 处，命中
              {{ wikilinkParseSummary.hit }} 处
            </span>
          </div>
          <el-alert
            v-if="wikilinkParseError"
            type="error"
            :closable="false"
            show-icon
            class="post-import-batch__alert"
            :title="wikilinkParseError"
          />
          <PostWikilinkParseTable
            :rows="wikilinkRows"
            :loading="parsing"
            show-source-path
            unbounded
            :empty-text="
              wikilinkParseError
                ? '双链解析失败，请重试'
                : wikilinkParseTried
                  ? '所有正文中均未发现 [[双链]] 或 ![[嵌入]]'
                  : '正在等待解析…'
            "
          />
        </div>
      </el-form-item>
            </el-form>
          </div>
        </section>

        <aside v-if="aiEnabled" class="post-import-batch__aside" aria-label="AI 推荐双链">
          <div class="post-import-batch__aside-head">
            <p class="post-import-batch__aside-lead">
              选择一篇 Markdown，从<strong>已有文库</strong>推荐相关文章；采纳结果仅写入该篇。
              <span v-if="aiAdoptedFileCount" class="post-import-batch__aside-stat">
                已为 {{ aiAdoptedFileCount }} 篇配置。
              </span>
            </p>
            <el-select
              v-model="aiSelectedPath"
              filterable
              placeholder="选择要推荐的文件"
              class="post-import-batch__ai-select"
            >
              <el-option
                v-for="opt in aiFileSelectOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
          <div v-if="selectedAiFile" class="post-import-batch__aside-panel">
            <PostAiLinkRecommendPanel
              :key="aiSelectedPath"
              :title="selectedAiFile.title"
              :markdown-body="selectedAiFile.body"
              :link-options="linkOptions"
              :exclude-slugs="aiExcludeSlugs"
              :existing-slugs="aiCurrentAdoptedSlugs"
              :initial-adopted-slugs="aiCurrentAdoptedSlugs"
              compact-lead="勾选要纳入的双链后确认；采纳结果仅写入当前所选文件。"
              opt-in-note="可选步骤：跳过 AI 推荐也可直接导入。"
              @complete="onAiRecommendComplete"
              @reset="onAiRecommendReset"
            />
          </div>
          <p v-else class="post-import-batch__aside-empty">请在上方选择要推荐的文件</p>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.post-import-batch {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0 0 8px;
  box-sizing: border-box;
}

.post-import-batch__skeleton {
  flex: 1;
  padding: 8px 0;
}

.post-import-batch__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.post-import-batch__workspace {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
  align-items: stretch;
  gap: var(--post-compose-panel-gap, 12px);
  overflow: hidden;
}

.post-import-batch__primary.compose-panel-card {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.post-import-batch__primary .compose-panel-card__content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
}

.post-import-batch__aside {
  flex: 0 0 clamp(260px, 28vw, 340px);
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.post-import-batch__aside-head {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-import-batch__aside-lead {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--admin-muted);

  strong {
    font-weight: 600;
    color: var(--admin-text);
  }
}

.post-import-batch__aside-stat {
  display: block;
  margin-top: 4px;
  font-weight: 600;
  color: var(--el-color-success);
}

.post-import-batch__ai-select {
  width: 100%;
}

.post-import-batch__aside-panel {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;

  :deep(.post-ai-recommend) {
    flex: 1;
    min-height: 0;
    height: 100%;
  }
}

.post-import-batch__aside-empty {
  flex: 1;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  font-size: 13px;
  color: var(--admin-muted);
  text-align: center;
  border: 1px dashed var(--admin-border);
  border-radius: 14px;
  background: var(--admin-toolbar-bg);
}

.post-import-batch__head {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.post-import-batch__title {
  margin: 0 0 8px;
  font-size: 1.35rem;
  font-weight: 600;
}

.post-import-batch__lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--admin-muted);
}

.post-import-batch__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.post-import-batch__alert {
  margin-bottom: 16px;
}

.post-import-batch__conflict-line {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
}

.post-import-batch__field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-color-warning);
  line-height: 1.45;
}

.post-import-batch__hint-inline {
  margin-left: 10px;
  font-size: 12px;
  color: var(--admin-muted);
}

.depth-radio {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.depth-radio__item {
  height: auto;
  align-items: flex-start;
  white-space: normal;
}

.depth-radio__samples {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--admin-muted);
}

.parent-mode-radio {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.parent-mode-radio__item {
  height: auto;
  align-items: flex-start;
  white-space: normal;
}

.parent-mode-radio__desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--admin-muted);
  line-height: 1.45;
}

.tree-preview {
  padding: 10px 12px;
  border: 1px solid var(--admin-border);
  border-radius: @radius-md;
  background: var(--admin-toolbar-bg);
  width: 100%;
}

.tree-preview-label {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding-right: 4px;
  box-sizing: border-box;
}

.wikilink-parse-block {
  width: 100%;
}

.wikilink-parse-block__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin-bottom: 10px;
}

.wikilink-parse-block__summary {
  font-size: 13px;
  font-weight: 600;
  color: var(--admin-text);
}

@media (max-width: 900px) {
  .post-import-batch__workspace {
    flex-direction: column;
    min-height: 0;
  }

  .post-import-batch__workspace--with-ai {
    min-height: 0;
  }

  .post-import-batch__aside {
    flex: 0 0 auto;
    width: 100%;
    min-height: 280px;
    max-height: 360px;
  }
}
</style>

<style lang="less">
@import '~/assets/styles/post-compose-shared.less';
</style>
