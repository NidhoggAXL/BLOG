/** 目录表行（与 `directories` 表一致，前后端共用类型） */
export interface DirectoryRow {
  id: number
  parent_id: number | null
  name: string
  slug: string
  sort_order: number
}
