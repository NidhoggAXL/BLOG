import { chromium } from 'playwright'

const url =
  process.argv[2] ||
  'http://localhost:3000/admin/posts/08%20%E7%BB%93%E6%9E%84%E4%BD%93'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

page.on('console', (m) => {
  if (m.type() === 'error') console.error('BROWSER ERR:', m.text())
})
page.on('pageerror', (e) => console.error('PAGE ERR:', e.message))

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })

for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(1000)
  const state = await page.evaluate(() => {
    const article = document.querySelector('.post-read.markdown-body')
    const styles = article ? getComputedStyle(article) : null
    return {
      title: document.querySelector('.post-compose__title')?.textContent?.trim() ?? '',
      articleExists: !!article,
      articleInnerLen: article?.innerHTML?.length ?? 0,
      articleTextLen: article?.innerText?.trim().length ?? 0,
      articleColor: styles?.color ?? null,
      articleBg: styles?.backgroundColor ?? null,
      articleHeight: article?.offsetHeight ?? 0,
      scrollHeight: document.querySelector('.post-view-card__scroll')?.scrollHeight ?? 0,
      skeleton: !!document.querySelector('.post-view-card__skeleton'),
      empty: document.querySelector('.post-markdown-body__empty')?.textContent ?? '',
      visibleText: article?.innerText?.slice(0, 80) ?? '',
    }
  })
  console.log(`t=${i}s`, JSON.stringify(state))
  if (state.articleInnerLen > 100 && state.articleTextLen > 10) break
}

await browser.close()
