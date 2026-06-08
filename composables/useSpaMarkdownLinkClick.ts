/** 拦截正文 v-html 内同源链接，避免整页刷新导致样式/脚本闪烁 */
export function useSpaMarkdownLinkClick(
  pathPrefix: MaybeRefOrGetter<string> = '/admin/posts/',
) {
  function onMarkdownContentClick(e: MouseEvent) {
    const prefix = toValue(pathPrefix)
    if (!(e.target instanceof Element)) return
    const anchor = e.target.closest('a[href]')
    if (!anchor || anchor.getAttribute('target') === '_blank') return
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#')) return

    let path: string
    try {
      const url = new URL(href, window.location.origin)
      if (url.origin !== window.location.origin) return
      path = url.pathname + url.search + url.hash
    } catch {
      return
    }

    if (!path.startsWith(prefix)) return

    e.preventDefault()
    navigateTo(path)
  }

  return { onMarkdownContentClick }
}
