import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
} from "d3-force";
import type {
  GraphForceSettings,
  GraphSimLink,
  GraphSimNode,
} from "~/types/graph";
import { DEFAULT_GRAPH_FORCES } from "~/types/graph";
import {
  type GraphDragMode,
  dragForceScaleForMode,
  scaledGraphForcesForDrag,
} from "~/utils/graphDrag";
import {
  D3_FORCE_CALIBRATION,
  GRAPH_SETTLE_PHYSICS,
  centerPullFromUi,
  linkPullFromUi,
  repelDistanceMax,
  repelManyBodyFromUi,
} from "~/utils/obsidianGraphForces";

export const GRAPH_SIM_VELOCITY_DECAY = D3_FORCE_CALIBRATION.velocityDecay;

/** 节点圆半径：入链越多越大（对齐 Obsidian「被引用多则圆大」） */
export function graphNodeRadius(inDegree: number, multiplier = 1): number {
  return (6 + Math.sqrt(inDegree + 1) * 3.5) * multiplier;
}

function collideRadius(d: GraphSimNode): number {
  return d.r + D3_FORCE_CALIBRATION.collidePadding;
}

function createManyBodyForce(
  repelStrength: number,
  width: number,
  height: number,
  nodeCount: number,
  linkDistance: number,
) {
  return forceManyBody<GraphSimNode>()
    .strength(repelManyBodyFromUi(repelStrength))
    .distanceMin(8)
    .distanceMax(repelDistanceMax(width, height, nodeCount, linkDistance))
    .theta(0.82);
}

function createCollideForce() {
  return forceCollide<GraphSimNode>()
    .radius(collideRadius)
    .strength(D3_FORCE_CALIBRATION.collideStrength)
    .iterations(3);
}

/** 将 API 节点转为模拟节点并赋初值（向日葵式微扰，靠近中心） */
export function buildSimNodes(
  nodes: GraphSimNode[],
  width: number,
  height: number,
  nodeSizeMultiplier: number,
): GraphSimNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const golden = Math.PI * (3 - Math.sqrt(5));
  return nodes.map((n, i) => {
    const r = graphNodeRadius(n.in_degree, nodeSizeMultiplier);
    const angle = i * golden;
    const dist = 12 + Math.sqrt(i + 1) * 6;
    return {
      ...n,
      r,
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
    };
  });
}

export type GraphSimulationBundle = {
  simulation: Simulation<GraphSimNode, GraphSimLink>;
};

function attachCenterForces(
  simulation: Simulation<GraphSimNode, GraphSimLink>,
  cx: number,
  cy: number,
  centerStrength: number,
  centerBoost = 1,
) {
  const pull = centerPullFromUi(centerStrength) * centerBoost;
  simulation.force("x", forceX<GraphSimNode>(cx).strength(pull));
  simulation.force("y", forceY<GraphSimNode>(cy).strength(pull));
}

export function createGraphSimulation(
  nodes: GraphSimNode[],
  links: GraphSimLink[],
  width: number,
  height: number,
  settings: GraphForceSettings = DEFAULT_GRAPH_FORCES,
): GraphSimulationBundle {
  const cx = width / 2;
  const cy = height / 2;

  const linkForce = forceLink<GraphSimNode, GraphSimLink>(links)
    .id((d) => d.id)
    .distance(settings.linkDistance)
    .strength(linkPullFromUi(settings.linkStrength))
    .iterations(D3_FORCE_CALIBRATION.linkIterations);

  const chargeForce = createManyBodyForce(
    settings.repelStrength,
    width,
    height,
    nodes.length,
    settings.linkDistance,
  );
  const collideForce = createCollideForce();

  const simulation = forceSimulation<GraphSimNode>(nodes)
    .force("link", linkForce)
    .force("charge", chargeForce)
    .force("collide", collideForce)
    .velocityDecay(D3_FORCE_CALIBRATION.velocityDecay)
    .alpha(1)
    .alphaDecay(D3_FORCE_CALIBRATION.alphaDecay)
    .alphaMin(D3_FORCE_CALIBRATION.alphaMin);

  attachCenterForces(simulation, cx, cy, settings.centerStrength);

  return { simulation };
}

function applyCollideStrength(
  simulation: Simulation<GraphSimNode, GraphSimLink>,
  strength: number,
) {
  const collide = simulation.force("collide");
  if (collide && "radius" in collide) {
    (collide as ReturnType<typeof forceCollide<GraphSimNode>>)
      .radius(collideRadius)
      .strength(strength)
      .iterations(3);
  }
}

export function applyGraphForces(
  bundle: GraphSimulationBundle,
  settings: GraphForceSettings,
  width: number,
  height: number,
  reheat = 0,
  options?: {
    dragging?: GraphDragMode | false;
    /** 松手回弹：临时加强向心，形成拉回中心的动画 */
    settling?: boolean;
  },
): void {
  const { simulation } = bundle;
  const cx = width / 2;
  const cy = height / 2;
  const dragMode = options?.dragging || false;
  const settling = options?.settling === true;
  const effective = dragMode
    ? scaledGraphForcesForDrag(settings, dragMode)
    : settings;
  const dragScale = dragMode ? dragForceScaleForMode(dragMode) : null;
  const centerBoost = settling ? GRAPH_SETTLE_PHYSICS.centerBoost : 1;

  const link = simulation.force("link");
  if (link && "distance" in link) {
    const lf = link as ReturnType<typeof forceLink<GraphSimNode, GraphSimLink>>;
    lf.distance(effective.linkDistance)
      .strength(linkPullFromUi(effective.linkStrength))
      .iterations(D3_FORCE_CALIBRATION.linkIterations);
  }

  const nodeCount = simulation.nodes().length;
  const charge = simulation.force("charge");
  if (charge && "strength" in charge) {
    (charge as ReturnType<typeof forceManyBody<GraphSimNode>>)
      .strength(repelManyBodyFromUi(effective.repelStrength))
      .distanceMin(8)
      .distanceMax(
        repelDistanceMax(width, height, nodeCount, effective.linkDistance),
      );
  }

  attachCenterForces(simulation, cx, cy, effective.centerStrength, centerBoost);

  applyCollideStrength(
    simulation,
    dragScale
      ? D3_FORCE_CALIBRATION.collideStrength * dragScale.collideStrength
      : D3_FORCE_CALIBRATION.collideStrength,
  );

  if (settling) {
    simulation
      .velocityDecay(GRAPH_SETTLE_PHYSICS.velocityDecay)
      .alphaDecay(GRAPH_SETTLE_PHYSICS.alphaDecay);
  } else {
    simulation
      .velocityDecay(
        dragScale ? dragScale.velocityDecay : D3_FORCE_CALIBRATION.velocityDecay,
      )
      .alphaDecay(D3_FORCE_CALIBRATION.alphaDecay);
  }

  if (reheat > 0) {
    simulation.alpha(Math.max(simulation.alpha(), reheat)).restart();
  }
}
