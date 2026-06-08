<script setup lang="ts">
import type { GraphData, GraphForceSettings, GraphNode, GraphSimNode } from "~/types/graph";
import { DEFAULT_GRAPH_FORCES } from "~/types/graph";
import { resolveGraphForceSettings } from "~/utils/obsidianGraphForces";

useHead({ title: "知识图谱星球" });

const graphDataFull = ref<GraphData | null>(null);
const loading = ref(false);
const fetchError = ref<string | null>(null);
const { loadPosts, isPublishedSlug, posts: publishedPosts } = useBlogContent();
const forces = reactive<GraphForceSettings>({ ...DEFAULT_GRAPH_FORCES });
const settingsOpen = ref(false);
const graphPageRef = ref<InstanceType<typeof PublicGraphPage> | null>(null);
const graphLayout = useGraphLayoutStore();
type GraphSearchSuggestion = {
  value: string
  label: string
  kind: "operator" | "path" | "file"
}
type GraphSearchClause = {
  op: "text" | "path" | "file"
  value: string
  negated: boolean
}
type ParsedGraphSearch = {
  groups: GraphSearchClause[][]
}

function normalizeSlugPath(raw: string): string {
  return raw.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
}

function slugBaseName(slug: string): string {
  const normalized = normalizeSlugPath(slug);
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

function slugDirPath(slug: string): string {
  const normalized = normalizeSlugPath(slug);
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(0, idx) : "";
}

function nodeDirectoryPath(node: GraphNode): string {
  const fromDirectory = normalizeSlugPath(node.directory_path ?? "");
  if (fromDirectory) return fromDirectory;
  return slugDirPath(node.slug);
}

function tokenizeGraphSearch(query: string): string[] {
  const tokens: string[] = [];
  const text = query.trim();
  let i = 0;
  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i]!)) i += 1;
    if (i >= text.length) break;
    const quote = text[i];
    if (quote === '"' || quote === "'") {
      i += 1;
      let buf = "";
      while (i < text.length) {
        const ch = text[i]!;
        if (ch === "\\" && i + 1 < text.length) {
          buf += text[i + 1]!;
          i += 2;
          continue;
        }
        if (ch === quote) {
          i += 1;
          break;
        }
        buf += ch;
        i += 1;
      }
      if (buf) tokens.push(buf);
      continue;
    }
    let j = i;
    while (j < text.length && !/\s/.test(text[j]!)) j += 1;
    tokens.push(text.slice(i, j));
    i = j;
  }
  return tokens;
}

function parseGraphSearchQuery(query: string): ParsedGraphSearch {
  const tokens = tokenizeGraphSearch(query);
  const groups: GraphSearchClause[][] = [[]];
  let groupIndex = 0;
  function isBoundaryToken(token: string): boolean {
    if (token === "OR") return true;
    return /^-?(path|file):/i.test(token);
  }
  for (let i = 0; i < tokens.length; i += 1) {
    let token = tokens[i]!;
    if (token === "OR") {
      if (groups[groupIndex]!.length) {
        groups.push([]);
        groupIndex += 1;
      }
      continue;
    }
    let negated = false;
    while (token.startsWith("-") && token.length > 1) {
      negated = !negated;
      token = token.slice(1);
    }
    const lower = token.toLowerCase();
    let op: GraphSearchClause["op"] = "text";
    let value = token;
    if (lower.startsWith("path:")) {
      op = "path";
      value = token.slice(5);
      const chunks: string[] = value ? [value] : [];
      while (i + 1 < tokens.length && !isBoundaryToken(tokens[i + 1]!)) {
        chunks.push(tokens[++i]!);
      }
      value = chunks.join(" ");
    } else if (lower.startsWith("file:")) {
      op = "file";
      value = token.slice(5);
      const chunks: string[] = value ? [value] : [];
      while (i + 1 < tokens.length && !isBoundaryToken(tokens[i + 1]!)) {
        chunks.push(tokens[++i]!);
      }
      value = chunks.join(" ");
    }
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) continue;
    groups[groupIndex]!.push({ op, value: normalizedValue, negated });
  }
  return { groups: groups.filter((group) => group.length > 0) };
}

function matchClause(node: GraphNode, clause: GraphSearchClause): boolean {
  const slug = normalizeSlugPath(node.slug);
  const directoryPath = nodeDirectoryPath(node);
  const basename = slugBaseName(node.slug);
  const title = node.title.toLowerCase();
  const value = clause.value;
  const directMatch = clause.op === "path"
    ? directoryPath.includes(value)
    : clause.op === "file"
      ? basename.includes(value)
      : slug.includes(value) || basename.includes(value) || title.includes(value);
  return clause.negated ? !directMatch : directMatch;
}

function matchSearch(node: GraphNode, parsed: ParsedGraphSearch): boolean {
  if (!parsed.groups.length) return true;
  return parsed.groups.some((group) => group.every((clause) => matchClause(node, clause)));
}

const searchSuggestions = computed<GraphSearchSuggestion[]>(() => {
  const full = graphDataFull.value;
  if (!full) return [];
  const query = forces.searchQuery;
  const visibleByOrphan = full.nodes.filter((n) => (forces.showOrphans ? true : !n.is_orphan));
  const operatorHints: GraphSearchSuggestion[] = [
    { value: "path:", label: "path: 匹配文件路径", kind: "operator" },
    { value: "file:", label: "file: 匹配文件名", kind: "operator" },
  ];
  if (!query.trim()) {
    return operatorHints;
  }
  const pathMatch = query.match(/^(.*?)(-?path:)([^"]*)$/i);
  if (pathMatch) {
    const prefix = pathMatch[1] ?? "";
    const op = pathMatch[2] ?? "path:";
    const keyword = (pathMatch[3] ?? "").trimStart().toLowerCase();
    const paths = new Set<string>();
    for (const n of visibleByOrphan) {
      const dir = nodeDirectoryPath(n);
      if (dir) paths.add(dir);
    }
    return [...paths]
      .filter((p) => !keyword || p.includes(keyword))
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .slice(0, 30)
      .map((p) => ({ value: `${prefix}${op}${p}`, label: p, kind: "path" as const }));
  }
  const fileMatch = query.match(/^(.*?)(-?file:)([^"]*)$/i);
  if (fileMatch) {
    const prefix = fileMatch[1] ?? "";
    const op = fileMatch[2] ?? "file:";
    const keyword = (fileMatch[3] ?? "").trimStart().toLowerCase();
    const names = new Set<string>();
    for (const n of visibleByOrphan) {
      const basename = slugBaseName(n.slug);
      if (basename) names.add(basename);
    }
    return [...names]
      .filter((name) => !keyword || name.includes(keyword))
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .slice(0, 30)
      .map((name) => ({
        value: `${prefix}${op}${name}`,
        label: name,
        kind: "file" as const,
      }));
  }
  if (/\s$/.test(query)) {
    return operatorHints.map((item) => ({ ...item, value: `${query}${item.value}` }));
  }
  if (!/[a-z]+:/i.test(query)) {
    return [];
  }
  return operatorHints;
});

const graphData = computed<GraphData | null>(() => {
  const full = graphDataFull.value;
  if (!full) return null;
  const parsed = parseGraphSearchQuery(forces.searchQuery);
  const visibleByOrphan = full.nodes.filter((n) => (forces.showOrphans ? true : !n.is_orphan));
  const nodes = visibleByOrphan.filter((n) => matchSearch(n, parsed));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = full.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  return {
    nodes,
    edges,
    meta: {
      ...full.meta,
      node_count: nodes.length,
      edge_count: edges.length,
    },
  };
});

function filterGraphToPublished(
  data: GraphData,
  publishedSlugs: Set<string>,
): GraphData {
  const nodes = data.nodes.filter((n) => publishedSlugs.has(n.slug));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = data.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );
  return {
    nodes,
    edges,
    meta: {
      ...data.meta,
      node_count: nodes.length,
      edge_count: edges.length,
    },
  };
}

async function loadGraph() {
  graphLayout.clear();
  loading.value = true;
  fetchError.value = null;
  try {
    await loadPosts(true);
    const publishedSlugs = new Set(publishedPosts.value.map((p) => p.slug));
    const data = await $fetch<GraphData>("/api/public/graph", {
      query: { showOrphans: forces.showOrphans ? "true" : "false" },
    });
    graphDataFull.value = filterGraphToPublished(data, publishedSlugs);
    Object.assign(
      forces,
      resolveGraphForceSettings(
        graphDataFull.value.meta.node_count,
        graphDataFull.value.meta.edge_count,
      ),
    );
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string };
    fetchError.value = err?.data?.statusMessage || err?.message || "加载图谱失败";
    graphDataFull.value = null;
  } finally {
    loading.value = false;
  }
}

function onNodeClick(node: GraphSimNode) {
  if (!isPublishedSlug(node.slug)) {
    ElMessage.warning("该文章未发布或已下线，图谱将同步刷新");
    void loadGraph();
    return;
  }
  navigateTo(`/blog/${encodeURIComponent(node.slug)}`);
}

function closeSettings() {
  settingsOpen.value = false;
  graphPageRef.value?.endForceTuning();
}

function openSettings() {
  settingsOpen.value = true;
}

function resetForces() {
  Object.assign(forces, { ...DEFAULT_GRAPH_FORCES });
  nextTick(() => graphPageRef.value?.reheat());
}

function onAnimate() {
  graphPageRef.value?.playAnimation();
}

function onDragStart() {
  graphPageRef.value?.beginForceTuning();
}

function onDragEnd() {
  graphPageRef.value?.endForceTuning();
}

onMounted(() => {
  loadGraph();
  window.addEventListener("pointerup", onDragEnd);
  window.addEventListener("pointercancel", onDragEnd);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerup", onDragEnd);
  window.removeEventListener("pointercancel", onDragEnd);
});
</script>

<template>
  <PublicMainShell>
    <PublicGraphPage
      ref="graphPageRef"
      v-model:forces="forces"
      :graph-data="graphData"
      :loading="loading"
      :fetch-error="fetchError"
      :settings-open="settingsOpen"
      :search-suggestions="searchSuggestions"
      @node-click="onNodeClick"
      @open-settings="openSettings"
      @close-settings="closeSettings"
      @reset="resetForces"
      @animate="onAnimate"
      @drag-start="onDragStart"
      @drag-end="onDragEnd"
    />
  </PublicMainShell>
</template>
