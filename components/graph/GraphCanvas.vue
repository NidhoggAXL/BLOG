<script setup lang="ts">
import {
  drag,
  easeCubicOut,
  select,
  zoom,
  type DragBehavior,
  type ZoomBehavior,
} from "d3";
import type {
  GraphData,
  GraphForceSettings,
  GraphNodePose,
  GraphSimLink,
  GraphSimNode,
} from "~/types/graph";
import { DEFAULT_GRAPH_FORCES } from "~/types/graph";
import {
  applyGraphForces,
  createGraphSimulation,
  graphNodeRadius,
} from "~/utils/graphSimulation";
import {
  anchorRevealNodes,
  buildGraphRevealOrder,
  easeRevealProgress,
  filterEdgesForVisibleNodes,
  getGraphRevealPacing,
  GRAPH_REVEAL_TIMING,
  newlyVisibleLinkPulls,
} from "~/utils/graphReveal";
import {
  type GraphDragSession,
  createGraphDragSession,
  enterGraphDragForces,
  exitGraphDragForces,
  isGraphSettling,
  moveGraphDrag,
  releaseGraphDragSession,
  shouldRunGraphSimulationTick,
} from "~/utils/graphDragLifecycle";
import {
  assignInitialGraphPositions,
  warmupGraphSimulation,
} from "~/utils/graphLayoutInit";
import {
  graphLabelOpacityByZoom,
  graphLabelsShouldShow,
} from "~/utils/graphLabelFade";

const props = withDefaults(
  defineProps<{
    data: GraphData | null;
    forces?: GraphForceSettings;
    loading?: boolean;
  }>(),
  {
    forces: () => ({ ...DEFAULT_GRAPH_FORCES }),
    loading: false,
  },
);

const emit = defineEmits<{
  nodeClick: [node: GraphSimNode];
}>();

const rootRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);

const simNodes = ref<GraphSimNode[]>([]);
const simLinks = ref<GraphSimLink[]>([]);
const hoveredId = ref<number | null>(null);
const draggedId = ref<number | null>(null);
/** 拖拽时高亮集合（锚点 + 直接邻居）；仅此时压低其余节点/边 */
const dragFocusIds = ref<Set<number> | null>(null);
let dragSession: GraphDragSession | null = null;
/** 松手后持续模拟直至布局回弹稳定 */
let graphSettling = false;
let nodeById = new Map<number, GraphSimNode>();
/** d3 zoom 当前缩放 k（用于文本透明度 = 0 时随缩放显隐标题） */
let zoomScale = 1;

let simulation: ReturnType<typeof createGraphSimulation> | null = null;
let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;
let resizeObserver: ResizeObserver | null = null;
let rafId = 0;
let viewport = { width: 320, height: 280 };
let forceTuning = false;
let lastCacheSnapshotAt = 0;
let suppressNodeClick = false;
let nodeDragBehavior: DragBehavior<
  SVGGElement,
  GraphSimNode,
  { x: number; y: number }
> | null = null;
let animating = false;
let visibleNodeIds: Set<number> | null = null;
let animationTimer: ReturnType<typeof setTimeout> | null = null;
/** 播放开始前快照，供后续步骤恢复已显现过的节点坐标 */
let revealLayoutCache: Map<number, GraphNodePose> | null = null;
/** 正在「拉动」显现的双链：从 anchor 拉向 extend */
type LinkPullState = { startedAt: number; anchorId: number; extendId: number };
let linkPullStarts = new Map<string, LinkPullState>();
/** 本步 sync 时应启动拉动动画的边 */
let pendingLinkPulls: Map<string, { anchorId: number; extendId: number }> | null =
  null;

function clearLinkPullState() {
  linkPullStarts.clear();
}

function startLinkPull(key: string, anchorId: number, extendId: number) {
  linkPullStarts.set(key, {
    startedAt: performance.now(),
    anchorId,
    extendId,
  });
}

function getLinkPullProgress(key: string): (LinkPullState & { progress: number }) | null {
  const state = linkPullStarts.get(key);
  if (state == null) return null;
  const t = (performance.now() - state.startedAt) / GRAPH_REVEAL_TIMING.linkPullMs;
  if (t >= 1) return null;
  return { ...state, progress: easeRevealProgress(t) };
}

function cleanupFinishedLinkPulls() {
  const now = performance.now();
  for (const [key, state] of linkPullStarts) {
    if ((now - state.startedAt) / GRAPH_REVEAL_TIMING.linkPullMs >= 1) {
      linkPullStarts.delete(key);
    }
  }
}

function waitForLinkPullsThenFinish(width: number, height: number) {
  cleanupFinishedLinkPulls();
  if (linkPullStarts.size === 0) {
    finishAnimationPlayback(width, height);
    return;
  }
  animationTimer = setTimeout(
    () => waitForLinkPullsThenFinish(width, height),
    32,
  );
}

function resolveLinkLineCoords(
  d: GraphSimLink,
  hasArrow: boolean,
  strokeW: number,
  pull: (LinkPullState & { progress: number }) | null,
) {
  if (pull != null) {
    const anchor = nodeById.get(pull.anchorId);
    const extend = nodeById.get(pull.extendId);
    const ax = anchor?.x ?? 0;
    const ay = anchor?.y ?? 0;
    const ex = extend?.x ?? ax;
    const ey = extend?.y ?? ay;
    const p = pull.progress;
    return {
      x1: ax,
      y1: ay,
      x2: ax + (ex - ax) * p,
      y2: ay + (ey - ay) * p,
    };
  }

  const source = d.source as GraphSimNode;
  const target = d.target as GraphSimNode;
  const sx = source.x ?? 0;
  const sy = source.y ?? 0;
  let tx = target.x ?? 0;
  let ty = target.y ?? 0;

  if (!hasArrow) return { x1: sx, y1: sy, x2: tx, y2: ty };

  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  const offset = Math.max(target.r + strokeW * 1.3 + 3, 8);
  return {
    x1: sx,
    y1: sy,
    x2: tx - (dx / len) * offset,
    y2: ty - (dy / len) * offset,
  };
}

const graphLayout = useGraphLayoutStore();

function buildPrevPosMap(): Map<number, GraphNodePose> {
  if (simulation) graphLayout.snapshotNodes(simulation.simulation.nodes());
  return graphLayout.prevPosMap();
}

const showLoadingMask = computed(
  () => props.loading && (!props.data || props.data.nodes.length === 0),
);

/** 悬停 / 拖拽共用：当前节点 + 直接邻居高亮，其余压低 */
const interactionFocusIds = computed(() => {
  if (dragFocusIds.value) return dragFocusIds.value;
  if (draggedId.value != null || hoveredId.value == null) return null;
  return neighborIdsOf(hoveredId.value, simLinks.value);
});

function refreshNodeById(nodes: GraphSimNode[]) {
  nodeById = new Map(nodes.map((n) => [n.id, n]));
}

function sizeOf(el: HTMLElement) {
  const w = el.clientWidth;
  const h = el.clientHeight;
  return { width: Math.max(w, 320), height: Math.max(h, 280) };
}

function nodeHitRadius(d: GraphSimNode) {
  return Math.max(d.r + 14, 22);
}

function isDragging() {
  return dragSession != null;
}

function isShiftDragEvent(event: { sourceEvent?: Event }) {
  const src = event.sourceEvent;
  return !!(src && "shiftKey" in src && (src as MouseEvent).shiftKey);
}

function endDragInteraction() {
  if (!simulation || !dragSession) return;
  exitGraphDragForces(
    simulation,
    props.forces,
    viewport.width,
    viewport.height,
    dragSession,
    nodeById,
  );
  graphSettling = true;
  dragSession = null;
  draggedId.value = null;
  dragFocusIds.value = null;
}

function abortDragInteraction() {
  if (dragSession) {
    releaseGraphDragSession(dragSession, nodeById);
    dragSession = null;
  }
  draggedId.value = null;
  dragFocusIds.value = null;
  graphSettling = false;
  if (simulation) {
    applyGraphForces(simulation, props.forces, viewport.width, viewport.height, 0, {
      dragging: false,
      settling: false,
    });
    simulation.simulation.alphaTarget(0);
  }
}

function linkKey(d: GraphSimLink) {
  const s = typeof d.source === "object" ? d.source.id : d.source;
  const t = typeof d.target === "object" ? d.target.id : d.target;
  return `${s}-${t}`;
}

function stopSimulation() {
  stopAnimationPlayback();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  simulation?.simulation.stop();
  simulation = null;
}

function stopAnimationPlayback() {
  animating = false;
  visibleNodeIds = null;
  revealLayoutCache = null;
  clearLinkPullState();
  if (animationTimer) {
    clearTimeout(animationTimer);
    animationTimer = null;
  }
  simulation?.simulation.alphaTarget(0);
}

/** 播放结束：不再二次 sync（避免全图重布局 + 高 reheat 导致闪烁） */
function finishAnimationPlayback(width: number, height: number) {
  animating = false;
  visibleNodeIds = null;
  revealLayoutCache = null;
  clearLinkPullState();
  if (animationTimer) {
    clearTimeout(animationTimer);
    animationTimer = null;
  }
  if (!simulation) return;

  graphLayout.snapshotNodes(simulation.simulation.nodes());
  const sim = simulation.simulation;
  sim.alphaTarget(0);
  applyGraphForces(simulation, props.forces, width, height, 0.02);

  const svgEl = svgRef.value;
  if (svgEl) {
    const root = select(svgEl).select<SVGGElement>("g.graph-root");
    root.selectAll("g.graph-node").interrupt().attr("opacity", null);
    root.selectAll("line.graph-link").interrupt().attr("opacity", null);
  }
}

function sliceGraphData(data: GraphData): GraphData {
  if (!animating || visibleNodeIds === null) return data;
  const ids = visibleNodeIds;
  return {
    nodes: data.nodes.filter((n) => ids.has(n.id)),
    edges: filterEdgesForVisibleNodes(data.edges, ids),
    meta: data.meta,
  };
}

function toSimLinks(
  nodes: GraphSimNode[],
  edges: GraphData["edges"],
): GraphSimLink[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edges
    .filter((e) => byId.has(e.source) && byId.has(e.target))
    .map((e) => ({
      source: byId.get(e.source)!,
      target: byId.get(e.target)!,
      link_kind: e.link_kind,
    }));
}

function labelOpacity(): number {
  return graphLabelOpacityByZoom(
    zoomScale,
    props.forces.textFadeMultiplier ?? 0,
  );
}

function nodeLabelsVisible(): boolean {
  return graphLabelsShouldShow(
    zoomScale,
    props.forces.textFadeMultiplier ?? 0,
  );
}

function linkStrokeWidth(): number {
  return Math.max(0.5, props.forces.lineSizeMultiplier ?? 1);
}

function arrowMarkerScale(): number {
  const nodeScale = props.forces.nodeSizeMultiplier ?? 1;
  const lineScale = props.forces.lineSizeMultiplier ?? 1;
  return Math.max(0.85, Math.min(2.2, nodeScale * 0.75 + lineScale * 0.25));
}

function updateArrowMarker() {
  const svgEl = svgRef.value;
  if (!svgEl) return;
  const marker = select(svgEl).select<SVGMarkerElement>("marker#graph-arrow");
  if (marker.empty()) return;
  const scale = arrowMarkerScale();
  marker
    .attr("refX", 14 + scale * 1.4)
    .attr("markerWidth", 6 * scale)
    .attr("markerHeight", 6 * scale);
}

function renderFrame() {
  const svg = svgRef.value;
  if (!svg || !simulation) return;

  const g = select(svg).select<SVGGElement>("g.graph-root");
  const focus = interactionFocusIds.value;
  const strokeW = linkStrokeWidth();
  const hasArrow = !!props.forces.showArrow;

  g.selectAll<SVGLineElement, GraphSimLink>("line.graph-link")
    .attr("x1", (d) => {
      const key = linkKey(d);
      const pull = animating ? getLinkPullProgress(key) : null;
      return resolveLinkLineCoords(d, hasArrow, strokeW, pull).x1;
    })
    .attr("y1", (d) => {
      const key = linkKey(d);
      const pull = animating ? getLinkPullProgress(key) : null;
      return resolveLinkLineCoords(d, hasArrow, strokeW, pull).y1;
    })
    .attr("x2", (d) => {
      const key = linkKey(d);
      const pull = animating ? getLinkPullProgress(key) : null;
      return resolveLinkLineCoords(d, hasArrow, strokeW, pull).x2;
    })
    .attr("y2", (d) => {
      const key = linkKey(d);
      const pull = animating ? getLinkPullProgress(key) : null;
      return resolveLinkLineCoords(d, hasArrow, strokeW, pull).y2;
    })
    .attr("opacity", (d) => {
      if (!animating) return null;
      const pull = getLinkPullProgress(linkKey(d));
      if (pull == null) return null;
      return 0.35 + pull.progress * 0.65;
    })
    .attr("stroke-width", strokeW)
    .attr("marker-end", (d) => {
      if (!props.forces.showArrow) return null;
      const key = linkKey(d);
      if (animating && getLinkPullProgress(key) != null) return null;
      return "url(#graph-arrow)";
    })
    .attr("class", (d) => {
      if (!focus) return "graph-link";
      const s = (d.source as GraphSimNode).id;
      const t = (d.target as GraphSimNode).id;
      return focus.has(s) && focus.has(t)
        ? "graph-link graph-link--hi"
        : "graph-link graph-link--dim";
    });

  g.selectAll<SVGGElement, GraphSimNode>("g.graph-node")
    .attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    .attr("class", (d) => {
      if (!focus) return "graph-node";
      return focus.has(d.id)
        ? "graph-node graph-node--hi"
        : "graph-node graph-node--dim";
    });

  const labelOp = labelOpacity();
  const labelsOn = labelOp > 0.04;
  g.selectAll<SVGTextElement, GraphSimNode>("text.graph-label")
    .style("display", labelsOn ? null : "none")
    .attr("opacity", labelOp)
    .attr("class", (d) => {
      if (!focus) return "graph-label";
      return focus.has(d.id)
        ? "graph-label graph-label--hi"
        : "graph-label graph-label--dim";
    });

  if (animating) cleanupFinishedLinkPulls();
}

function tickLoop() {
  const sim = simulation?.simulation;
  if (sim) {
    const shouldTick = shouldRunGraphSimulationTick(sim.alpha(), sim.alphaMin(), {
      dragging: isDragging(),
      settling: graphSettling,
      forceTuning,
      revealing: animating,
    });
    if (shouldTick) sim.tick();
    if (graphSettling && !isGraphSettling(sim.alpha())) {
      graphSettling = false;
      sim.alphaTarget(0);
      applyGraphForces(simulation, props.forces, viewport.width, viewport.height, 0, {
        settling: false,
      });
    }
  }
  renderFrame();
  if (sim && !forceTuning && !isDragging() && !graphSettling && sim.alpha() < 0.02) {
    const now = performance.now();
    if (now - lastCacheSnapshotAt > 400) {
      graphLayout.snapshotNodes(sim.nodes());
      lastCacheSnapshotAt = now;
    }
  }
  rafId = requestAnimationFrame(tickLoop);
}

function isGraphZoomAllowed(event: Event) {
  const target = event.target as Element | null;
  if (target?.closest?.(".graph-node")) return false;
  if (event.type === "wheel") return true;
  const pe = event as PointerEvent;
  return pe.type.startsWith("touch") || pe.button === 0;
}

function mountNodeShapes(
  g: ReturnType<typeof select<SVGGElement, GraphSimNode>>,
  mode: "enter" | "update",
) {
  if (mode === "enter") {
    g.append("circle").attr("class", (d) =>
      d.is_orphan
        ? "graph-node__dot graph-node__dot--orphan"
        : "graph-node__dot",
    );
    g.append("text")
      .attr("class", "graph-label")
      .attr("text-anchor", "middle")
      .text((d) => d.title);
    g.append("circle")
      .attr("class", "graph-node__hit")
      .attr("fill", "transparent");
  }
  g.select<SVGCircleElement, GraphSimNode>("circle.graph-node__dot")
    .attr("class", (d) =>
      d.is_orphan
        ? "graph-node__dot graph-node__dot--orphan"
        : "graph-node__dot",
    )
    .attr("r", (d) => d.r);
  g.select<SVGTextElement, GraphSimNode>("text.graph-label")
    .text((d) => d.title)
    .attr("y", (d) => d.r + 12)
    .style("display", graphLabelsShouldShow(zoomScale, props.forces.textFadeMultiplier ?? 0) ? null : "none");
  g.select<SVGCircleElement, GraphSimNode>("circle.graph-node__hit").attr(
    "r",
    (d) => nodeHitRadius(d),
  );
}

function createNodeDrag(svgEl: SVGSVGElement) {
  const svg = select(svgEl);
  const rootEl = () => svg.select<SVGGElement>("g.graph-root").node()!;

  return drag<SVGGElement, GraphSimNode>()
    .container(rootEl)
    .clickDistance(4)
    .subject((_event, d) => ({ x: d.x ?? 0, y: d.y ?? 0 }))
    .on("start", function (event, d) {
      event.sourceEvent?.stopPropagation();
      suppressNodeClick = false;
      hoveredId.value = null;
      draggedId.value = d.id;
      refreshNodeById(simulation!.simulation.nodes());
      graphSettling = false;

      const shiftCluster = isShiftDragEvent(event);
      dragSession = createGraphDragSession(
        d,
        simLinks.value,
        nodeById,
        { x: event.x, y: event.y },
        shiftCluster,
      );
      dragFocusIds.value = dragSession.focusIds;
      enterGraphDragForces(
        simulation!,
        props.forces,
        viewport.width,
        viewport.height,
      );

      select(this)
        .raise()
        .classed("graph-node--dragging", true)
        .classed("graph-node--dragging-cluster", shiftCluster);

      if (!event.active) svg.on(".zoom", null);
      renderFrame();
    })
    .on("drag", function (event, d) {
      suppressNodeClick = true;
      if (dragSession) {
        moveGraphDrag(dragSession, d, { x: event.x, y: event.y }, nodeById);
      }
      renderFrame();
    })
    .on("end", function (event, d) {
      select(this)
        .classed("graph-node--dragging", false)
        .classed("graph-node--dragging-cluster", false);

      if (!event.active && zoomBehavior) svg.call(zoomBehavior);

      endDragInteraction();
      graphLayout.snapshotNodes(simulation!.simulation.nodes());

      if (!suppressNodeClick) emit("nodeClick", d);
      suppressNodeClick = false;
    });
}

function bindNodeDrag(svgEl: SVGSVGElement) {
  nodeDragBehavior = createNodeDrag(svgEl);
  select(svgEl)
    .selectAll<SVGGElement, GraphSimNode>("g.graph-node")
    .call(nodeDragBehavior);
}

function bindNodeLayer(nodeG: {
  style: (name: string, value: string) => unknown;
  on: (
    typenames: string,
    listener: (ev: Event, d: GraphSimNode) => void,
  ) => unknown;
  selectAll: (selector: string) => {
    attr: (name: string, fn: (d: GraphSimNode) => number) => unknown;
  };
}) {
  nodeG
    .on("pointerenter", (_ev, d) => {
      if (draggedId.value == null) hoveredId.value = d.id;
    })
    .on("pointerleave", () => {
      if (draggedId.value == null) hoveredId.value = null;
    });

  nodeG
    .selectAll<SVGCircleElement, GraphSimNode>("circle")
    .attr("r", (d) => d.r);

  nodeG
    .selectAll<SVGTextElement, GraphSimNode>("text.graph-label")
    .attr("y", (d) => d.r + 12);
}

function buildNodesFromData(
  data: GraphData,
  width: number,
  height: number,
  prevPos: Map<number, GraphNodePose>,
  restoredIds: Set<number>,
  opts?: { skipGlobalLayout?: boolean },
): GraphSimNode[] {
  const nodes = data.nodes.map((n) => ({
    ...n,
    r: graphNodeRadius(n.in_degree, props.forces.nodeSizeMultiplier),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  })) as GraphSimNode[];

  if (!opts?.skipGlobalLayout) {
    assignInitialGraphPositions(nodes, data.edges, width, height);
    for (const n of nodes) {
      const prev = prevPos.get(n.id);
      if (restoredIds.has(n.id) && prev != null) {
        n.x = prev.x;
        n.y = prev.y;
        n.vx = 0;
        n.vy = 0;
      }
    }
  }

  return nodes;
}

function applyNodeSizes(multiplier: number) {
  if (!simulation) return;
  const nodes = simulation.simulation.nodes();
  for (const n of nodes) {
    n.r = graphNodeRadius(n.in_degree, multiplier);
  }
  const svgEl = svgRef.value;
  if (svgEl) {
    select(svgEl)
      .selectAll<SVGCircleElement, GraphSimNode>("circle.graph-node__dot")
      .attr("r", (d) => d.r);
    select(svgEl)
      .selectAll<SVGCircleElement, GraphSimNode>("circle.graph-node__hit")
      .attr("r", (d) => nodeHitRadius(d));
    select(svgEl)
      .selectAll<SVGTextElement, GraphSimNode>("text.graph-label")
      .attr("y", (d) => d.r + 12);
  }
  const collide = simulation.simulation.force("collide");
  if (collide && "radius" in collide) {
    (collide as { radius: (d: GraphSimNode) => number }).radius((d) => d.r + 2);
  }
  updateArrowMarker();
  simulation.simulation
    .alpha(Math.max(simulation.simulation.alpha(), 0.25))
    .restart();
}

function applyForcesLive(reheat = 0) {
  if (!simulation) return;
  const heat = isDragging() || graphSettling ? 0 : forceTuning ? 0 : reheat;
  applyGraphForces(simulation, props.forces, viewport.width, viewport.height, heat, {
    dragging: false,
    settling: graphSettling,
  });
  if (isDragging() || graphSettling) renderFrame();
}

function beginForceTuning() {
  if (!simulation) return;
  forceTuning = true;
  simulation.simulation.alphaTarget(0.28).alpha(0.65).restart();
}

function endForceTuning() {
  if (!simulation) return;
  forceTuning = false;
  simulation.simulation.alphaTarget(0);
}

function drawGraph(width: number, height: number, opts?: { keepReveal?: boolean }) {
  const svgEl = svgRef.value;
  const raw = props.data;
  if (!svgEl || !raw?.nodes.length) return;

  const data = sliceGraphData(raw);
  if (!data.nodes.length) return;

  viewport = { width, height };
  if (!opts?.keepReveal) stopAnimationPlayback();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  simulation?.simulation.stop();
  simulation = null;

  const prevPos = buildPrevPosMap();
  const restoredIds = new Set(
    data.nodes.filter((n) => prevPos.has(n.id)).map((n) => n.id),
  );
  const nodes = buildNodesFromData(data, width, height, prevPos, restoredIds);
  const links = toSimLinks(nodes, data.edges);

  simNodes.value = nodes;
  simLinks.value = links;
  refreshNodeById(nodes);

  const svg = select(svgEl);
  svg.selectAll("*").remove();
  svg
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.08, 4])
    .filter(isGraphZoomAllowed)
    .on("zoom", (event) => {
      zoomScale = event.transform.k;
      select(svgEl)
        .select("g.graph-zoom-layer")
        .attr("transform", event.transform);
      renderFrame();
    });

  svg.call(zoomBehavior).on("dblclick.zoom", null);

  const zoomLayer = svg.append("g").attr("class", "graph-zoom-layer");
  const root = zoomLayer.append("g").attr("class", "graph-root");

  svg
    .append("defs")
    .append("marker")
    .attr("id", "graph-arrow")
    .attr("viewBox", "0 -4 8 8")
    .attr("refX", 14)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-4L8,0L0,4")
    .attr("fill", "var(--admin-muted)");
  updateArrowMarker();

  root
    .append("g")
    .attr("class", "graph-links")
    .selectAll("line")
    .data(links, linkKey)
    .join("line")
    .attr("class", "graph-link");

  const nodeG = root
    .append("g")
    .attr("class", "graph-nodes")
    .selectAll("g")
    .data(nodes, (d) => d.id)
    .join("g")
    .attr("class", "graph-node");

  mountNodeShapes(nodeG, "enter");

  bindNodeLayer(nodeG);
  simulation = createGraphSimulation(nodes, links, width, height, props.forces);
  simLinks.value = links;
  bindNodeDrag(svgEl);
  graphLayout.snapshotNodes(nodes);

  const mostlyFresh = restoredIds.size < nodes.length * 0.45;
  if (mostlyFresh) {
    warmupGraphSimulation(simulation, props.forces, width, height, nodes.length);
    graphLayout.snapshotNodes(simulation.simulation.nodes());
    graphSettling = false;
  }

  if (!rafId) rafId = requestAnimationFrame(tickLoop);
}

function syncGraphData(width: number, height: number, reheatOverride?: number) {
  const svgEl = svgRef.value;
  const raw = props.data;
  if (!svgEl || !raw) return;

  viewport = { width, height };
  const data = sliceGraphData(raw);

  if (!raw.nodes.length) {
    stopSimulation();
    select(svgEl).selectAll("*").remove();
    simNodes.value = [];
    simLinks.value = [];
    graphLayout.clear();
    return;
  }

  if (!simulation) {
    drawGraph(width, height);
    return;
  }

  const idsBefore = new Set(simulation.simulation.nodes().map((n) => n.id));
  const prevPos = buildPrevPosMap();
  const restoredIds = new Set(
    data.nodes
      .filter((n) => !idsBefore.has(n.id) && prevPos.has(n.id))
      .map((n) => n.id),
  );
  const previousSim = new Map(
    simulation.simulation.nodes().map((n) => [n.id, n]),
  );
  const nodes = buildNodesFromData(
    data,
    width,
    height,
    prevPos,
    restoredIds,
    animating ? { skipGlobalLayout: true } : undefined,
  );
  const links = toSimLinks(nodes, data.edges);
  if (animating) {
    anchorRevealNodes(
      nodes,
      data.edges,
      previousSim,
      width,
      height,
      revealLayoutCache ?? undefined,
    );
  }
  const fadeEnter = animating;

  simulation.simulation.nodes(nodes);
  const linkForce = simulation.simulation.force("link");
  if (linkForce && "links" in linkForce) {
    (linkForce as { links: (l: GraphSimLink[]) => void }).links(links);
  }

  simNodes.value = nodes;
  simLinks.value = links;
  refreshNodeById(nodes);

  const root = select(svgEl).select<SVGGElement>("g.graph-root");

  root
    .select("g.graph-links")
    .selectAll<SVGLineElement, GraphSimLink>("line")
    .data(links, linkKey)
    .join(
      (enter) =>
        enter
          .append("line")
          .attr("class", "graph-link")
          .each(function (d) {
            if (!fadeEnter) return;
            const k = linkKey(d);
            const spec = pendingLinkPulls?.get(k);
            if (spec) {
              startLinkPull(k, spec.anchorId, spec.extendId);
              select(this).attr("opacity", 0.35);
            }
          }),
      (update) => update.attr("opacity", null),
      (exit) => exit.remove(),
    );

  const nodeG = root
    .select("g.graph-nodes")
    .selectAll<SVGGElement, GraphSimNode>("g.graph-node")
    .data(nodes, (d) => d.id)
    .join(
      (enter) => {
        const g = enter.append("g").attr("class", "graph-node");
        mountNodeShapes(g, "enter");
        if (fadeEnter) {
          g.attr("opacity", 0)
            .transition()
            .duration(GRAPH_REVEAL_TIMING.fadeMs)
            .ease(easeCubicOut)
            .attr("opacity", 1);
        }
        return g;
      },
      (update) => {
        mountNodeShapes(update, "update");
        return update.attr("opacity", null);
      },
      (exit) => exit.remove(),
    );

  bindNodeLayer(nodeG);
  bindNodeDrag(svgEl);

  let reheat = reheatOverride;
  if (reheat == null) {
    reheat = restoredIds.size > 0 ? 0.06 : animating ? GRAPH_REVEAL_TIMING.stepReheat : 0.45;
  }
  applyGraphForces(simulation, props.forces, width, height, reheat);
  if (animating) {
    simulation.simulation
      .alphaTarget(GRAPH_REVEAL_TIMING.alphaTarget)
      .alpha(
        Math.max(
          simulation.simulation.alpha(),
          reheatOverride ?? GRAPH_REVEAL_TIMING.stepReheat,
        ),
      )
      .restart();
  }
}

function playAnimation() {
  const el = rootRef.value;
  const raw = props.data;
  if (!el || !raw?.nodes.length) return;

  stopAnimationPlayback();
  if (draggedId.value != null) {
    abortDragInteraction();
  }

  const order = buildGraphRevealOrder(raw);
  if (!order.length) return;

  const { width, height } = sizeOf(el);
  const { stepSize, stepMs } = getGraphRevealPacing(order.length);

  const startSteps = () => {
    if (!simulation) return;

    let index = 1;

    const step = () => {
      if (!animating || !simulation) return;

      const visibleBefore = new Set(visibleNodeIds!);
      const batchEnd = Math.min(order.length, index + stepSize);
      for (let i = index; i < batchEnd; i++) visibleNodeIds!.add(order[i]!);
      index = batchEnd;

      pendingLinkPulls = new Map(
        newlyVisibleLinkPulls(raw.edges, visibleBefore, visibleNodeIds!).map(
          (spec) => [spec.key, { anchorId: spec.anchorId, extendId: spec.extendId }],
        ),
      );
      syncGraphData(width, height, GRAPH_REVEAL_TIMING.stepReheat);
      pendingLinkPulls = null;

      if (index < order.length) {
        animationTimer = setTimeout(step, stepMs);
      } else {
        waitForLinkPullsThenFinish(width, height);
      }
    };

    animationTimer = setTimeout(step, stepMs);
  };

  animating = true;
  visibleNodeIds = new Set([order[0]]);

  if (!simulation) {
    revealLayoutCache = graphLayout.prevPosMap();
    drawGraph(width, height, { keepReveal: true });
    nextTick(() => {
      if (simulation) {
        graphLayout.snapshotNodes(simulation.simulation.nodes());
        revealLayoutCache = graphLayout.prevPosMap();
      }
      simulation?.simulation
        .alphaTarget(GRAPH_REVEAL_TIMING.alphaTarget)
        .restart();
      startSteps();
    });
    return;
  }

  graphLayout.snapshotNodes(simulation.simulation.nodes());
  revealLayoutCache = graphLayout.prevPosMap();
  syncGraphData(width, height, GRAPH_REVEAL_TIMING.startReheat);
  simulation.simulation.alphaTarget(GRAPH_REVEAL_TIMING.alphaTarget).restart();
  startSteps();
}

function relayout() {
  const el = rootRef.value;
  if (!el || !props.data) return;
  const { width, height } = sizeOf(el);
  if (simulation) syncGraphData(width, height);
  else drawGraph(width, height);
}

watch(
  () => props.data,
  () => {
    if (animating) stopAnimationPlayback();
    nextTick(relayout);
  },
  { deep: true },
);

watch(
  () => [props.forces.centerStrength, props.forces.linkDistance],
  () => applyForcesLive(),
);

watch(
  () => props.forces.repelStrength,
  () => applyForcesLive(0.45),
);

watch(
  () => props.forces.linkStrength,
  () => {
    applyForcesLive(0.45);
  },
);
watch(
  () => props.forces.nodeSizeMultiplier,
  () => applyNodeSizes(props.forces.nodeSizeMultiplier),
);

watch(
  () => props.forces.textFadeMultiplier,
  () => {
    renderFrame();
  },
);

watch(
  () => [props.forces.lineSizeMultiplier, props.forces.showArrow],
  () => {
    updateArrowMarker();
    renderFrame();
  },
);

onMounted(() => {
  const el = rootRef.value;
  if (!el) return;
  resizeObserver = new ResizeObserver(() => {
    const { width, height } = sizeOf(el);
    if (simulation) {
      viewport = { width, height };
      applyGraphForces(simulation, props.forces, width, height, 0);
    } else {
      relayout();
    }
  });
  resizeObserver.observe(el);
  nextTick(relayout);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  stopSimulation();
});

defineExpose({
  beginForceTuning,
  endForceTuning,
  reheat: () => applyForcesLive(0.55),
  playAnimation,
  stopAnimation: stopAnimationPlayback,
});
</script>

<template>
  <div
    class="graph-canvas"
    :class="{ 'graph-canvas--loading': showLoadingMask }"
  >
    <div ref="rootRef" class="graph-canvas__stage">
      <svg
        v-show="data?.nodes.length"
        ref="svgRef"
        class="graph-canvas__svg"
        role="img"
        aria-label="知识图谱"
      />
      <div
        v-if="!showLoadingMask && !data?.nodes.length"
        class="graph-canvas__empty"
      >
        <p>暂无文章节点</p>
      </div>
      <div v-if="showLoadingMask" class="graph-canvas__loading-mask">
        <div class="graph-canvas__loading-panel">
          <div class="route-loading-spinner graph-canvas__loading-spinner" aria-hidden="true" />
          <p class="graph-canvas__loading-label">正在加载</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.graph-canvas {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 12px;
  border: 1px solid var(--admin-border);
  background: var(--admin-shell-bg);
  overflow: hidden;
}

.graph-canvas__stage {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.graph-canvas__svg {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  touch-action: none;
}

.graph-canvas__empty,
.graph-canvas__loading-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--admin-muted);
}

.graph-canvas__loading-mask {
  background: color-mix(in srgb, var(--admin-shell-bg) 75%, transparent);
  backdrop-filter: blur(2px);
}

.graph-canvas__loading-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 22px;
  border-radius: 12px;
  border: 1px solid var(--admin-border);
  background: var(--admin-card-bg);
  box-shadow: var(--admin-card-shadow);
}

.graph-canvas__loading-spinner {
  width: 26px;
  height: 26px;
  border-width: 3px;
}

.graph-canvas__loading-label {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--admin-muted);
}

:deep(.graph-link) {
  stroke: color-mix(in srgb, var(--admin-muted) 70%, var(--accent) 30%);
  stroke-opacity: 0.32;
  stroke-width: 1;
  stroke-linecap: round;
}

:deep(.graph-link--hi) {
  stroke: var(--accent);
  stroke-opacity: 0.92;
  stroke-width: 1.6;
  filter: drop-shadow(
    0 0 3px color-mix(in srgb, var(--accent) 45%, transparent)
  );
}

:deep(.graph-link--dim) {
  stroke-opacity: 0.07;
}

:deep(.graph-node__hit) {
  fill: transparent;
  stroke: none;
  cursor: grab;
  pointer-events: all;
}

:deep(.graph-node--dragging .graph-node__hit) {
  cursor: grabbing;
}

:deep(.graph-node--dragging-cluster .graph-node__dot) {
  stroke-dasharray: 3 2;
}

:deep(.graph-node__dot),
:deep(.graph-label) {
  pointer-events: none;
}

:deep(.graph-node__dot) {
  fill: color-mix(in srgb, var(--accent) 48%, var(--admin-shell-bg));
  stroke: color-mix(in srgb, var(--accent) 65%, transparent);
  stroke-width: 1.25;
  filter: drop-shadow(
    0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)
  );
}

:deep(.graph-node__dot--orphan) {
  fill: color-mix(in srgb, var(--admin-muted) 40%, var(--admin-shell-bg));
  stroke: var(--admin-muted);
  stroke-opacity: 0.6;
}

:deep(.graph-node--hi .graph-node__dot) {
  fill: var(--accent);
  stroke: #fff;
  stroke-width: 2;
  filter: drop-shadow(
    0 0 6px color-mix(in srgb, var(--accent) 60%, transparent)
  );
}

:deep(.graph-node--dim .graph-node__dot) {
  opacity: 0.18;
}

:deep(.graph-node--dim .graph-label) {
  opacity: 0.15;
}

:deep(.graph-label) {
  font-size: 10px;
  fill: var(--admin-text);
  pointer-events: none;
  user-select: none;
}

:deep(.graph-label--dim) {
  opacity: 0.2;
}

:deep(.graph-label--hi) {
  font-weight: 600;
  font-size: 11px;
}
</style>
