<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue'
import GraphCanvas from '~/components/graph/GraphCanvas.vue'
import GraphSettingsPanel from '~/components/graph/GraphSettingsPanel.vue'
import type { GraphData, GraphForceSettings, GraphNode, GraphSimNode } from '~/types/graph'
import { DEFAULT_GRAPH_FORCES } from '~/types/graph'
import { resolveGraphForceSettings } from '~/utils/obsidianGraphForces'

definePageMeta({
  layout: 'admin',
})

const graphDataFull = ref<GraphData | null>(null)
const loading = ref(false)
const fetchError = ref<string | null>(null)
const forces = reactive<GraphForceSettings>({ ...DEFAULT_GRAPH_FORCES })
const settingsOpen = ref(false)
const canvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null)
const graphLayout = useGraphLayoutStore()
type GraphSearchSuggestion = {
  value: string
  label: string
  kind: 'operator' | 'path' | 'file'
}
type GraphSearchClause = {
  op: 'text' | 'path' | 'file'
  value: string
  negated: boolean
}
type ParsedGraphSearch = {
  groups: GraphSearchClause[][]
}

function normalizeSlugPath(raw: string): string {
  return raw.trim().replace(/^\/+|\/+$/g, '').toLowerCase()
}

function slugBaseName(slug: string): string {
  const normalized = normalizeSlugPath(slug)
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(idx + 1) : normalized
}

function slugDirPath(slug: string): string {
  const normalized = normalizeSlugPath(slug)
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(0, idx) : ''
}

function nodeDirectoryPath(node: GraphNode): string {
  const fromDirectory = normalizeSlugPath(node.directory_path ?? '')
  if (fromDirectory) return fromDirectory
  return slugDirPath(node.slug)
}

function tokenizeGraphSearch(query: string): string[] {
  const tokens: string[] = []
  const text = query.trim()
  let i = 0
  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i]!)) i += 1
    if (i >= text.length) break
    const quote = text[i]
    if (quote === '"' || quote === '\'') {
      i += 1
      let buf = ''
      while (i < text.length) {
        const ch = text[i]!
        if (ch === '\\' && i + 1 < text.length) {
          buf += text[i + 1]!
          i += 2
          continue
        }
        if (ch === quote) {
          i += 1
          break
        }
        buf += ch
        i += 1
      }
      if (buf) tokens.push(buf)
      continue
    }
    let j = i
    while (j < text.length && !/\s/.test(text[j]!)) j += 1
    tokens.push(text.slice(i, j))
    i = j
  }
  return tokens
}

function parseGraphSearchQuery(query: string): ParsedGraphSearch {
  const tokens = tokenizeGraphSearch(query)
  const groups: GraphSearchClause[][] = [[]]
  let groupIndex = 0
  function isBoundaryToken(token: string): boolean {
    if (token === 'OR') return true
    return /^-?(path|file):/i.test(token)
  }
  for (let i = 0; i < tokens.length; i += 1) {
    let token = tokens[i]!
    if (token === 'OR') {
      if (groups[groupIndex]!.length) {
        groups.push([])
        groupIndex += 1
      }
      continue
    }
    let negated = false
    while (token.startsWith('-') && token.length > 1) {
      negated = !negated
      token = token.slice(1)
    }
    const lower = token.toLowerCase()
    let op: GraphSearchClause['op'] = 'text'
    let value = token
    if (lower.startsWith('path:')) {
      op = 'path'
      value = token.slice(5)
      const chunks: string[] = value ? [value] : []
      while (i + 1 < tokens.length && !isBoundaryToken(tokens[i + 1]!)) {
        chunks.push(tokens[++i]!)
      }
      value = chunks.join(' ')
    } else if (lower.startsWith('file:')) {
      op = 'file'
      value = token.slice(5)
      const chunks: string[] = value ? [value] : []
      while (i + 1 < tokens.length && !isBoundaryToken(tokens[i + 1]!)) {
        chunks.push(tokens[++i]!)
      }
      value = chunks.join(' ')
    }
    const normalizedValue = value.trim().toLowerCase()
    if (!normalizedValue) continue
    groups[groupIndex]!.push({ op, value: normalizedValue, negated })
  }
  return { groups: groups.filter((group) => group.length > 0) }
}

function matchClause(node: GraphNode, clause: GraphSearchClause): boolean {
  const slug = normalizeSlugPath(node.slug)
  const directoryPath = nodeDirectoryPath(node)
  const basename = slugBaseName(node.slug)
  const title = node.title.toLowerCase()
  const value = clause.value
  const directMatch = clause.op === 'path'
    ? directoryPath.includes(value)
    : clause.op === 'file'
      ? basename.includes(value)
      : slug.includes(value) || basename.includes(value) || title.includes(value)
  return clause.negated ? !directMatch : directMatch
}

function matchSearch(node: GraphNode, parsed: ParsedGraphSearch): boolean {
  if (!parsed.groups.length) return true
  return parsed.groups.some((group) => group.every((clause) => matchClause(node, clause)))
}

const searchSuggestions = computed<GraphSearchSuggestion[]>(() => {
  const full = graphDataFull.value
  if (!full) return []
  const query = forces.searchQuery
  const visibleByOrphan = full.nodes.filter((n) => (forces.showOrphans ? true : !n.is_orphan))
  const operatorHints: GraphSearchSuggestion[] = [
    { value: 'path:', label: 'path: 匹配文件路径', kind: 'operator' },
    { value: 'file:', label: 'file: 匹配文件名', kind: 'operator' },
  ]
  if (!query.trim()) {
    return operatorHints
  }
  const pathMatch = query.match(/^(.*?)(-?path:)([^"]*)$/i)
  if (pathMatch) {
    const prefix = pathMatch[1] ?? ''
    const op = pathMatch[2] ?? 'path:'
    const keyword = (pathMatch[3] ?? '').trimStart().toLowerCase()
    const paths = new Set<string>()
    for (const n of visibleByOrphan) {
      const dir = nodeDirectoryPath(n)
      if (dir) paths.add(dir)
    }
    return [...paths]
      .filter((p) => !keyword || p.includes(keyword))
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
      .slice(0, 30)
      .map((p) => ({ value: `${prefix}${op}${p}`, label: p, kind: 'path' as const }))
  }
  const fileMatch = query.match(/^(.*?)(-?file:)([^"]*)$/i)
  if (fileMatch) {
    const prefix = fileMatch[1] ?? ''
    const op = fileMatch[2] ?? 'file:'
    const keyword = (fileMatch[3] ?? '').trimStart().toLowerCase()
    const names = new Set<string>()
    for (const n of visibleByOrphan) {
      const basename = slugBaseName(n.slug)
      if (basename) names.add(basename)
    }
    return [...names]
      .filter((name) => !keyword || name.includes(keyword))
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
      .slice(0, 30)
      .map((name) => ({
        value: `${prefix}${op}${name}`,
        label: name,
        kind: 'file' as const,
      }))
  }
  if (/\s$/.test(query)) {
    return operatorHints.map((item) => ({ ...item, value: `${query}${item.value}` }))
  }
  if (!/[a-z]+:/i.test(query)) {
    return []
  }
  return operatorHints
})

const graphData = computed<GraphData | null>(() => {
  const full = graphDataFull.value
  if (!full) return null
  const parsed = parseGraphSearchQuery(forces.searchQuery)
  const visibleByOrphan = full.nodes.filter((n) => (forces.showOrphans ? true : !n.is_orphan))
  const nodes = visibleByOrphan.filter((n) => matchSearch(n, parsed))
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = full.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
  return {
    nodes,
    edges,
    meta: {
      ...full.meta,
      node_count: nodes.length,
      edge_count: edges.length,
    },
  }
})

async function loadGraph() {
  graphLayout.clear()
  loading.value = true
  fetchError.value = null
  try {
    const data = await $fetch<GraphData>('/api/graph', {
      query: { showOrphans: 'true' },
    })
    graphDataFull.value = data
    Object.assign(
      forces,
      resolveGraphForceSettings(data.meta.node_count, data.meta.edge_count),
    )
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    fetchError.value = err?.data?.statusMessage || err?.message || '加载图谱失败'
    graphDataFull.value = null
  } finally {
    loading.value = false
  }
}

function onNodeClick(node: GraphSimNode) {
  navigateTo(`/admin/posts/${encodeURIComponent(node.slug)}`)
}

function closeSettings() {
  settingsOpen.value = false
  canvasRef.value?.endForceTuning()
}

function openSettings() {
  settingsOpen.value = true
}

function resetForces() {
  Object.assign(forces, { ...DEFAULT_GRAPH_FORCES })
  nextTick(() => canvasRef.value?.reheat())
}

function onAnimate() {
  canvasRef.value?.playAnimation()
}

function onDragStart() {
  canvasRef.value?.beginForceTuning()
}

function onDragEnd() {
  canvasRef.value?.endForceTuning()
}

onMounted(() => {
  loadGraph()
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
})
</script>

<template>
  <div class="graph-page">
    <section class="admin-card admin-card--flush admin-card--stretch graph-page__card">
      <ClientOnly>
        <div class="graph-page__canvas-wrap">
          <GraphCanvas
            ref="canvasRef"
            :data="graphData"
            :forces="forces"
            :loading="loading"
            @node-click="onNodeClick"
          />

          <button
            v-show="!settingsOpen"
            type="button"
            class="graph-settings-btn"
            aria-label="打开图谱设置"
            @click.stop="openSettings"
          >
            <el-icon :size="18"><Setting /></el-icon>
          </button>

          <Transition name="graph-settings-fade">
            <GraphSettingsPanel
              v-if="settingsOpen"
              v-model="forces"
              :fetch-error="fetchError"
              :search-suggestions="searchSuggestions"
              @close="closeSettings"
              @reset="resetForces"
              @animate="onAnimate"
              @drag-start="onDragStart"
              @drag-end="onDragEnd"
            />
          </Transition>
        </div>
      </ClientOnly>
    </section>
  </div>
</template>

<style scoped lang="less">
.graph-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.graph-page__card {
  flex: 1;
  min-height: 0;
}

.graph-page__canvas-wrap {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.graph-settings-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--admin-border);
  background: color-mix(in srgb, var(--admin-card-bg) 92%, transparent);
  color: var(--admin-muted);
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: var(--admin-text);
    background: var(--admin-nav-hover);
  }
}

.graph-settings-fade-enter-active,
.graph-settings-fade-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.graph-settings-fade-enter-from,
.graph-settings-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
