/** post_aliases 表行（对外 API） */
export type PostAlias = {
  id: number
  alias: string
  created_at: string
}

export type PostAliasesListResult = {
  aliases: PostAlias[]
  table_missing?: boolean
}

export type WikilinkRebuildResult = {
  ok: boolean
  posts_rebuilt: number
  edges_written: number
}
