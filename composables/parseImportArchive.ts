import JSZip from "jszip";
import { decodeZipEntryName } from "~/utils/decodeZipEntryName";

const MD_EXT = /\.(md|markdown|mdown|mkd)$/i;

export type ImportMdFile = {
  /** zip 内归一化路径，如 notes/2024/foo.md */
  path: string;
  fileName: string;
  body: string;
  title: string;
  slug: string;
};

export type ArchivePathPreview = {
  /** 可选：从第几层路径段开始作为目录树（0 = 不丢弃） */
  depth: number;
  label: string;
  sampleDirs: string[];
};

function normalizeZipPath(raw: string): string {
  return raw.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

function isIgnoredPath(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  if (base.startsWith(".")) return true;
  if (path.includes("__MACOSX/")) return true;
  return false;
}

/** 从 zip 读取全部 Markdown 文件 */
export async function extractMarkdownFilesFromZip(
  file: File,
): Promise<ImportMdFile[]> {
  const zip = await JSZip.loadAsync(file, {
    decodeFileName: decodeZipEntryName,
  });
  const out: ImportMdFile[] = [];
  const entries = Object.keys(zip.files).filter((name) => {
    const ent = zip.files[name];
    if (!ent || ent.dir) return false;
    const path = normalizeZipPath(name);
    if (!MD_EXT.test(path)) return false;
    if (isIgnoredPath(path)) return false;
    return true;
  });
  for (const name of entries.sort()) {
    const ent = zip.files[name]!;
    const path = normalizeZipPath(name);
    const body = await ent.async("string");
    const fileName = path.split("/").pop() ?? path;
    const payload = buildMdImportPayload(fileName, body, { path });
    out.push({
      path,
      fileName,
      body: payload.body,
      title: payload.title,
      slug: payload.slug,
    });
  }
  return out;
}

/** 根据路径段深度计算目录预览 */
export function buildArchiveDepthOptions(
  files: ImportMdFile[],
): ArchivePathPreview[] {
  if (!files.length) return [];
  const maxSeg = Math.max(
    ...files.map((f) => f.path.split("/").filter(Boolean).length - 1),
    0,
  );
  const options: ArchivePathPreview[] = [];
  for (let depth = 0; depth <= maxSeg; depth++) {
    const dirSet = new Set<string>();
    for (const f of files) {
      const segs = f.path.split("/").filter(Boolean);
      const dirSegs = segs.slice(depth, -1);
      if (dirSegs.length) dirSet.add(dirSegs.join("/"));
    }
    const samples = [...dirSet].sort().slice(0, 5);
    const label =
      depth === 0
        ? "从压缩包根目录开始建目录"
        : `丢弃前 ${depth} 级路径后再建目录`;
    options.push({ depth, label, sampleDirs: samples });
  }
  return options;
}

/** 按 depth 得到某文件在库内的目录相对段（不含文件名） */
export function directorySegmentsForFile(
  path: string,
  depth: number,
): string[] {
  const segs = path.split("/").filter(Boolean);
  if (segs.length <= 1) return [];
  return segs.slice(depth, -1);
}

/** 压缩包内目录树预览（用于 UI 树） */
export type ImportDirPreviewNode = {
  label: string;
  children?: ImportDirPreviewNode[];
};

export function buildImportDirPreviewTree(
  files: ImportMdFile[],
  depth: number,
): ImportDirPreviewNode[] {
  const root: ImportDirPreviewNode[] = [];
  const map = new Map<string, ImportDirPreviewNode>();

  function ensure(segs: string[]): ImportDirPreviewNode {
    let key = "";
    let list = root;
    let node: ImportDirPreviewNode | undefined;
    for (const seg of segs) {
      key = key ? `${key}/${seg}` : seg;
      node = map.get(key);
      if (!node) {
        node = { label: seg, children: [] };
        map.set(key, node);
        list.push(node);
      }
      list = node.children!;
    }
    return node!;
  }

  for (const f of files) {
    const dirSegs = directorySegmentsForFile(f.path, depth);
    const parent = dirSegs.length ? ensure(dirSegs) : null;
    const leaf: ImportDirPreviewNode = { label: f.fileName };
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(leaf);
    } else {
      root.push(leaf);
    }
  }
  return root;
}

/** 预览树仅保留一级目录名（不含子目录与文件） */
export function buildImportDirPreviewTopLevel(
  files: ImportMdFile[],
  depth: number,
): ImportDirPreviewNode[] {
  const dirs = new Set<string>();
  for (const f of files) {
    const dirSegs = directorySegmentsForFile(f.path, depth);
    if (dirSegs.length > 0) dirs.add(dirSegs[0]!);
  }
  return [...dirs].sort().map((label) => ({ label }));
}
