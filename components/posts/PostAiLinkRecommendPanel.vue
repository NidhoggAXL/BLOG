<script setup lang="ts">
import { Check, MagicStick, RefreshRight } from '@element-plus/icons-vue'
import type { WikilinkLinkOption } from '~/composables/useWikilinkTextareaAutocomplete'

defineOptions({ name: 'PostAiLinkRecommendPanel' })

type Suggestion = {
  slug: string
  title: string
  reason: string
  score?: number
}

const props = defineProps<{
  linkOptions: WikilinkLinkOption[]
  excludeSlugs?: string[]
  existingSlugs?: string[]
  maxSuggestions?: number
  markdownBody?: string
  title?: string
  /** 批量导入等场景：已采纳 slug，用于切换文件时恢复状态 */
  initialAdoptedSlugs?: string[]
  compactLead?: string
  optInNote?: string
  doneHint?: string
  /** 嵌入批量导入等页面：避免 flex 容器把推荐列表高度裁成 0 */
  embedded?: boolean
}>()

const emit = defineEmits<{
  complete: [payload: { adoptedSlugs: string[] }]
  reset: []
}>()

const maxSuggestions = computed(() => props.maxSuggestions ?? 6)

const suggestions = ref<Suggestion[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const selected = ref<Set<string>>(new Set())
const reviewed = ref(false)
const started = ref(false)

const slugToPath = computed(() => {
  const map = new Map<string, string>()
  for (const o of props.linkOptions) {
    map.set(o.value.toLowerCase(), o.directoryPath ?? '')
  }
  return map
})

const displayDoneHint = computed(() => {
  if (props.doneHint) return props.doneHint
  return `已确认推荐（采纳 ${selected.value.size} 条）。可在左侧「双链」中继续调整。`
})

async function fetchSuggestions() {
  loading.value = true
  loadError.value = null
  reviewed.value = false
  suggestions.value = []
  selected.value = new Set()

  try {
    const res = await $fetch<{ suggestions: Suggestion[] }>('/api/ai/wikilink-suggest', {
      method: 'POST',
      body: {
        title: props.title ?? '',
        body: props.markdownBody ?? '',
        exclude_slugs: props.excludeSlugs ?? [],
        existing_slugs: props.existingSlugs ?? [],
        max_suggestions: maxSuggestions.value,
      },
    })
    suggestions.value = res.suggestions ?? []
    selected.value = new Set(suggestions.value.map((s) => s.slug))
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value =
      err?.data?.message || err?.message || 'AI 推荐失败，请确认 Ollama 与 embedding 模型已就绪'
    suggestions.value = []
  } finally {
    loading.value = false
  }
}

function startRecommend() {
  started.value = true
  void fetchSuggestions()
}

function toggle(slug: string, on: boolean) {
  const next = new Set(selected.value)
  if (on) next.add(slug)
  else next.delete(slug)
  selected.value = next
}

function confirmReview() {
  reviewed.value = true
  emit('complete', { adoptedSlugs: [...selected.value] })
}

function skipReview() {
  selected.value = new Set()
  confirmReview()
}

function resetRecommend() {
  started.value = false
  reviewed.value = false
  loadError.value = null
  suggestions.value = []
  selected.value = new Set()
  emit('reset')
}

function applyInitialAdoptedIfAny() {
  const slugs = props.initialAdoptedSlugs
  if (!slugs?.length) return
  selected.value = new Set(slugs)
  reviewed.value = true
  started.value = true
  loadError.value = null
  suggestions.value = []
}

watch(
  () => props.initialAdoptedSlugs,
  (slugs, prev) => {
    const next = slugs ?? []
    const old = prev ?? []
    if (next.length === old.length && next.every((s, i) => s === old[i])) return
    if (next.length) applyInitialAdoptedIfAny()
  },
  { deep: true },
)

onMounted(() => {
  applyInitialAdoptedIfAny()
})
</script>

<template>
  <section
    class="post-ai-recommend compose-panel-card"
    :class="{ 'post-ai-recommend--embedded': embedded }"
    aria-label="AI 推荐双链"
  >
    <header class="compose-panel-card__head post-ai-recommend__head">
      <h2 class="compose-panel-card__title">AI 推荐双链</h2>
      <el-tag v-if="reviewed" size="small" type="success" effect="plain">已采纳</el-tag>
      <el-tag v-else-if="loading" size="small" type="info" effect="plain">分析中</el-tag>
      <el-tag v-else size="small" type="warning" effect="plain">可选</el-tag>
    </header>

    <div class="compose-panel-card__content post-ai-recommend__body">
      <div v-if="!started && !reviewed" class="post-ai-recommend__opt-in">
        <el-icon class="post-ai-recommend__icon" :size="28"><MagicStick /></el-icon>
        <p class="post-ai-recommend__opt-in-title">可选用 AI 推荐双链</p>
        <p class="post-ai-recommend__lead">
          AI 会根据正文语义，从知识库中推荐可能相关的文章，供你勾选后写入双链。
        </p>
        <p class="post-ai-recommend__opt-in-note">
          {{ optInNote ?? '这是可选步骤：不使用 AI 推荐，也可以直接保存文章。' }}
        </p>
        <el-button type="primary" :icon="MagicStick" @click="startRecommend">
          开始 AI 推荐
        </el-button>
      </div>

      <template v-else>
        <div v-if="!reviewed" class="post-ai-recommend__hero post-ai-recommend__hero--compact">
          <p class="post-ai-recommend__lead">
            {{
              compactLead ??
              '勾选要纳入的双链后点击确认；采纳结果会写入左侧「双链」列表，你仍可继续手动调整。'
            }}
          </p>
        </div>

      <div v-if="loading" class="post-ai-recommend__loading">
        <el-skeleton :rows="4" animated />
      </div>

      <div v-else-if="loadError" class="post-ai-recommend__error">
        <p>{{ loadError }}</p>
        <el-button type="primary" link :icon="RefreshRight" @click="fetchSuggestions">
          重试
        </el-button>
        <el-button text @click="resetRecommend">暂不使用</el-button>
      </div>

      <template v-else-if="!loading">
        <ul v-if="suggestions.length" class="post-ai-recommend__list">
          <li
            v-for="item in suggestions"
            :key="item.slug"
            class="post-ai-recommend__item"
            :class="{ 'post-ai-recommend__item--done': reviewed }"
          >
            <div class="post-ai-recommend__item-row">
              <el-checkbox
                class="post-ai-recommend__checkbox"
                :model-value="selected.has(item.slug)"
                :disabled="reviewed"
                @update:model-value="(v: boolean) => toggle(item.slug, v)"
              />
              <div class="post-ai-recommend__item-content">
                <span class="post-ai-recommend__item-title">{{ item.title || item.slug }}</span>
                <span
                  v-if="slugToPath.get(item.slug.toLowerCase())"
                  class="post-ai-recommend__item-path"
                >
                  {{ slugToPath.get(item.slug.toLowerCase()) }}
                </span>
                <p v-if="item.reason" class="post-ai-recommend__item-reason">{{ item.reason }}</p>
              </div>
            </div>
          </li>
        </ul>

        <p v-else class="post-ai-recommend__empty">
          暂无可推荐的文章（库内其他文章或均已关联）。
        </p>

        <div v-if="!reviewed" class="post-ai-recommend__actions">
          <el-button v-if="suggestions.length" type="primary" :icon="Check" @click="confirmReview">
            确认推荐选择
          </el-button>
          <el-button v-if="suggestions.length" text @click="skipReview">全部不采纳</el-button>
          <el-button v-else text @click="resetRecommend">知道了</el-button>
        </div>

        <div v-else class="post-ai-recommend__done">
          <p class="post-ai-recommend__done-hint">
            {{ displayDoneHint }}
          </p>
          <el-button text :icon="RefreshRight" @click="resetRecommend">重新推荐</el-button>
        </div>
      </template>
      </template>
    </div>
  </section>
</template>

<style scoped lang="less">
.compose-scroll-y() {
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

.post-ai-recommend {
  height: 100%;
  min-height: 0;
}

.post-ai-recommend--embedded {
  height: auto;
  min-height: 0;

  .compose-panel-card__content {
    flex: none;
    min-height: auto;
    overflow: visible;
  }

  .post-ai-recommend__body {
    max-height: min(480px, 70vh);
    overflow-x: hidden;
    overflow-y: auto;
  }
}

.post-ai-recommend__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
}

.post-ai-recommend__body {
  .compose-scroll-y();
}

.post-ai-recommend__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 4px 4px 14px;

  &--compact {
    padding-bottom: 10px;
  }
}

.post-ai-recommend__opt-in {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 12px 8px 8px;
}

.post-ai-recommend__opt-in-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--admin-text);
}

.post-ai-recommend__opt-in-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--admin-muted);
}

.post-ai-recommend__icon {
  color: var(--el-color-primary);
  opacity: 0.85;
}

.post-ai-recommend__lead {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--admin-muted);
  max-width: 24em;
}

.post-ai-recommend__loading {
  padding: 8px 0;
}

.post-ai-recommend__error {
  text-align: center;
  padding: 8px 0 12px;
  font-size: 13px;
  color: var(--el-color-danger);
  line-height: 1.5;

  p {
    margin: 0 0 8px;
  }
}

.post-ai-recommend__list {
  margin: 0 0 14px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-ai-recommend__item {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--post-read-border, var(--admin-border));
  background: var(--post-read-surface-muted, var(--admin-nav-hover));
  transition: border-color 0.2s ease, opacity 0.2s ease;

  &--done {
    opacity: 0.72;
  }
}

.post-ai-recommend__item-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.post-ai-recommend__checkbox {
  flex-shrink: 0;
  margin-top: 2px;

  :deep(.el-checkbox__label) {
    display: none;
  }
}

.post-ai-recommend__item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.post-ai-recommend__item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--admin-text);
}

.post-ai-recommend__item-path {
  font-size: 12px;
  color: var(--admin-muted);
}

.post-ai-recommend__item-reason {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--el-color-primary);
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.post-ai-recommend__empty {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--admin-muted);
  text-align: center;
}

.post-ai-recommend__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding-top: 4px;
}

.post-ai-recommend__done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.post-ai-recommend__done-hint {
  margin: 0;
  width: 100%;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  border-radius: 8px;
  text-align: center;
}
</style>
