/** 是否为真实目录 id（排除虚拟侧栏节点如「未归类」） */
export function isRealDirectoryNavId(id: number | null): id is number {
  return id != null && id > 0
}
