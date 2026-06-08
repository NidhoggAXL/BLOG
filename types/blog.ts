/** 公开展示端类型（与 types/post.ts 后台类型区分） */

export type TreeNodeType = "folder" | "file";

export interface TreeNode {
  id: string;
  name: string;
  type: TreeNodeType;
  sort_order?: number;
  sort_time?: number;
  slug?: string;
  children?: TreeNode[];
}

export interface PublicDirectoryRow {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  sort_order: number;
}

export interface PublicPostMeta {
  slug: string;
  title: string;
  directory_id?: number | null;
  date: string;
  tags: string[];
}

export type PostWikilinkRef = {
  slug: string;
  title: string;
};

export interface PublicPostDetail extends PublicPostMeta {
  body_html: string;
  inbound_links?: PostWikilinkRef[];
  outbound_links?: PostWikilinkRef[];
}

/** Markdown 标题大纲项（# ~ ######） */
export interface TocHeading {
  level: number;
  text: string;
  id: string;
}
