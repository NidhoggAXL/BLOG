export function directoryDuplicateEntryMessage(sqlMessage?: string): string {
  const msg = sqlMessage ?? ''
  if (msg.includes('uk_dir_parent_name')) {
    return '同一父级下目录名称已存在，请更换名称'
  }
  if (msg.includes('uk_dir_parent_slug')) {
    return '同一父级下 slug 已存在，请更换英文路径'
  }
  return '同一父级下目录名称或 slug 已存在'
}
