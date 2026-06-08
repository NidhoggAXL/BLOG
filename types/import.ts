export type ImportBatchFileItem = {
  path: string
  title: string
  body: string
  slug?: string
}

export type ImportBatchResult = {
  directories_created: number
  posts_created: number
  post_slugs: string[]
  warnings: string[]
}
