import { HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/** 编辑页 Markdown 源码：浅色主题语法高亮 */
export const composeMdSourceHighlightLight = HighlightStyle.define([
  { tag: tags.processingInstruction, color: '#64748b', fontWeight: '600' },
  { tag: tags.labelName, color: '#7c3aed', fontWeight: '500' },
  { tag: tags.monospace, color: '#0f766e', backgroundColor: 'rgba(15, 118, 110, 0.08)' },
  { tag: tags.comment, color: '#94a3b8', fontStyle: 'italic' },
  { tag: tags.url, color: '#2563eb', textDecoration: 'underline' },
  { tag: tags.link, color: '#2563eb', textDecoration: 'underline' },
  { tag: tags.heading1, color: '#0f172a', fontWeight: '700' },
  { tag: tags.heading2, color: '#1e293b', fontWeight: '700' },
  { tag: tags.heading3, color: '#334155', fontWeight: '650' },
  { tag: tags.heading4, color: '#475569', fontWeight: '650' },
  { tag: tags.heading5, color: '#64748b', fontWeight: '600' },
  { tag: tags.heading6, color: '#64748b', fontWeight: '600' },
  { tag: tags.heading, color: '#1e293b', fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#475569' },
  { tag: tags.strong, fontWeight: '700', color: '#0f172a' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#94a3b8' },
  { tag: tags.quote, color: '#64748b', fontStyle: 'italic' },
  { tag: tags.list, color: '#475569' },
  { tag: tags.string, color: '#b45309' },
  { tag: tags.contentSeparator, color: '#cbd5e1', fontWeight: '600' },
])

/** 编辑页 Markdown 源码：深色主题语法高亮（```、# 等标记更易辨认） */
export const composeMdSourceHighlightDark = HighlightStyle.define([
  { tag: tags.processingInstruction, color: '#fbbf24', fontWeight: '700' },
  { tag: tags.labelName, color: '#c4b5fd', fontWeight: '600' },
  { tag: tags.monospace, color: '#7dd3fc', backgroundColor: 'rgba(56, 189, 248, 0.14)' },
  { tag: tags.comment, color: '#9ca3af', fontStyle: 'italic' },
  { tag: tags.url, color: '#93c5fd', textDecoration: 'underline' },
  { tag: tags.link, color: '#93c5fd', textDecoration: 'underline' },
  { tag: tags.heading1, color: '#f9fafb', fontWeight: '700' },
  { tag: tags.heading2, color: '#f3f4f6', fontWeight: '700' },
  { tag: tags.heading3, color: '#e5e7eb', fontWeight: '650' },
  { tag: tags.heading4, color: '#d1d5db', fontWeight: '650' },
  { tag: tags.heading5, color: '#d1d5db', fontWeight: '600' },
  { tag: tags.heading6, color: '#9ca3af', fontWeight: '600' },
  { tag: tags.heading, color: '#f3f4f6', fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#d1d5db' },
  { tag: tags.strong, fontWeight: '700', color: '#f9fafb' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#9ca3af' },
  { tag: tags.quote, color: '#a5b4fc', fontStyle: 'italic' },
  { tag: tags.list, color: '#d1d5db' },
  { tag: tags.string, color: '#fcd34d' },
  { tag: tags.contentSeparator, color: '#6b7280', fontWeight: '600' },
  { tag: tags.character, color: '#f9a8d4' },
  { tag: tags.escape, color: '#fde68a' },
])
