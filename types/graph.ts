/** 图谱节点（与 GET /api/graph 一致） */
export interface GraphNode {
  id: number;
  slug: string;
  title: string;
  /** 目录路径（例如：`01 C语言基础 / 指针`），用于图谱 path: 筛选 */
  directory_path?: string;
  /** 笔记创建时间（ISO），播放动画按此从早到晚显现 */
  created_at: string;
  in_degree: number;
  out_degree: number;
  degree: number;
  is_orphan: boolean;
}

export interface GraphEdge {
  source: number;
  target: number;
  link_kind: "link" | "embed";
}

export interface GraphMeta {
  node_count: number;
  edge_count: number;
  orphan_count: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: GraphMeta;
}

/** 图谱显示与力导向参数（对齐 Obsidian graph.json） */
export interface GraphForceSettings {
  showOrphans: boolean;
  searchQuery: string;
  showArrow: boolean;
  textFadeMultiplier: number;
  nodeSizeMultiplier: number;
  lineSizeMultiplier: number;
  centerStrength: number;
  repelStrength: number;
  linkStrength: number;
  linkDistance: number;
}

/** 力度与显示默认值（滑块处于各范围中点） */
export const DEFAULT_GRAPH_FORCES: GraphForceSettings = {
  showOrphans: true,
  searchQuery: "",
  showArrow: true,
  textFadeMultiplier: 0,
  nodeSizeMultiplier: 0.85,
  lineSizeMultiplier: 1,
  centerStrength: 1.1,
  repelStrength: 700,
  linkStrength: 0.5,
  linkDistance: 235,
};

/** 力度滑块范围：default 为 (min+max)/2，恢复默认时滑块在中间 */
export const GRAPH_FORCE_SLIDER_RANGES = {
  centerStrength: { min: 0, max: 2.2, step: 0.01 },
  repelStrength: { min: 0, max: 1400, step: 10 },
  linkStrength: { min: 0, max: 1, step: 0.01 },
  linkDistance: { min: 35, max: 435, step: 5 },
} as const;

/** 力模拟节点坐标缓存（隐藏/再显示孤立节点、离开页面再返回时恢复） */
export interface GraphNodePose {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** 力模拟中的节点（扩展位置与速度） */
export interface GraphSimNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  r: number;
}

export interface GraphSimLink {
  source: number | GraphSimNode;
  target: number | GraphSimNode;
  link_kind: "link" | "embed";
}
