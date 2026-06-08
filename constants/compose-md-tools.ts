export type ComposeMdToolDirective =
  | 'bold'
  | 'italic'
  | 'strikeThrough'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'hr'
  | 'quote'
  | 'unorderedList'
  | 'orderedList'
  | 'task'
  | 'codeRow'
  | 'code'
  | 'link'
  | 'image'
  | 'table'
  | 'katexInline'
  | 'katexBlock'
  | 'callout'

export type ComposeMdTool = {
  directive: ComposeMdToolDirective
  title: string
}

/** 左侧 Markdown 工具（调用编辑器 execCommand） */
export const COMPOSE_MD_TOOLS: ComposeMdTool[] = [
  { directive: 'h1', title: '一级标题' },
  { directive: 'h2', title: '二级标题' },
  { directive: 'h3', title: '三级标题' },
  { directive: 'hr', title: '分隔线' },
  { directive: 'bold', title: '粗体' },
  { directive: 'italic', title: '斜体' },
  { directive: 'strikeThrough', title: '删除线' },
  { directive: 'quote', title: '引用' },
  { directive: 'unorderedList', title: '无序列表' },
  { directive: 'orderedList', title: '有序列表' },
  { directive: 'task', title: '任务列表' },
  { directive: 'codeRow', title: '行内代码' },
  { directive: 'code', title: '代码块' },
  { directive: 'link', title: '链接' },
  { directive: 'image', title: '图片' },
  { directive: 'table', title: '表格' },
  { directive: 'katexInline', title: '行内公式' },
  { directive: 'katexBlock', title: '公式块' },
  { directive: 'callout', title: 'Callout 块' },
]

/** 中间栏横向工具栏分组（组间显示分隔线） */
export const COMPOSE_MD_TOOLBAR_GROUPS: ComposeMdToolDirective[][] = [
  ['h1', 'h2', 'h3', 'hr'],
  ['bold', 'italic', 'strikeThrough'],
  ['quote', 'callout'],
  ['unorderedList', 'orderedList', 'task'],
  ['codeRow', 'code', 'link', 'image', 'table'],
  ['katexInline', 'katexBlock'],
]

const toolTitleMap = new Map(COMPOSE_MD_TOOLS.map((t) => [t.directive, t.title]))

export function getComposeMdToolTitle(directive: ComposeMdToolDirective): string {
  return toolTitleMap.get(directive) ?? directive
}
