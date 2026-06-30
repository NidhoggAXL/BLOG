/**
 * 目录结构页：工作区应可滚动，且不应套用 fill 布局
 * 用法: NUXT_URL=http://localhost:3001 node scripts/test-directories-scroll.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import jwt from 'jsonwebtoken'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const base = process.env.NUXT_URL || 'http://localhost:3000'
const cookieName = process.env.AUTH_COOKIE_NAME || 'blog_auth'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function isFillPagePath(pathname) {
  const fillRoutes = ['/admin/posts']
  const fillRouteExcludes = [
    '/admin/posts/new',
    '/admin/posts/directories',
    '/admin/posts/import',
    '/admin/posts/edit',
  ]
  if (fillRouteExcludes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false
  }
  return fillRoutes.includes(pathname)
}

function testFillRouteLogic() {
  assert(isFillPagePath('/admin/posts'), '/admin/posts 应为 fill 页')
  assert(!isFillPagePath('/admin/posts/directories'), '/admin/posts/directories 不应为 fill 页')
  assert(!isFillPagePath('/admin/posts/new'), '/admin/posts/new 不应为 fill 页')
  assert(!isFillPagePath('/admin/posts/import/batch'), '/admin/posts/import 不应为 fill 页')
  console.log('✓ fill 路由判定逻辑')
}

async function resolveAuthUser() {
  if (process.env.TEST_USER_ID && process.env.TEST_USER) {
    return { id: process.env.TEST_USER_ID, username: process.env.TEST_USER }
  }
  try {
    const mysql = await import('mysql2/promise')
    const envPath = path.join(root, '.env')
    const env = Object.fromEntries(
      fs
        .readFileSync(envPath, 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => {
          const i = l.indexOf('=')
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
        }),
    )
    const pool = mysql.createPool({
      host: env.MYSQL_HOST || '127.0.0.1',
      user: env.MYSQL_USER || 'root',
      password: env.MYSQL_PASSWORD || '',
      database: env.MYSQL_DATABASE,
    })
    const [rows] = await pool.query('SELECT id, username FROM users LIMIT 1')
    await pool.end()
    const row = rows[0]
    assert(row?.id && row?.username, '数据库中无可用用户，无法测试登录态')
    return { id: String(row.id), username: row.username }
  } catch (e) {
    throw new Error(`无法解析测试用户: ${e.message}`)
  }
}

function createAuthCookie(user) {
  const pem = fs.readFileSync(path.join(root, '.keys/jwt-private.pem'), 'utf8')
  const token = jwt.sign({ sub: user.id, username: user.username }, pem, {
    algorithm: 'RS256',
    expiresIn: '7d',
  })
  return `${cookieName}=${token}`
}

async function main() {
  testFillRouteLogic()

  const user = await resolveAuthUser()
  const cookie = createAuthCookie(user)
  const [cookieNameOnly, cookieValue] = cookie.split('=')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  await context.addCookies([
    {
      name: cookieNameOnly,
      value: cookieValue,
      url: base,
    },
  ])

  const page = await context.newPage()
  await page.goto(`${base}/admin/posts/directories`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.admin-directories-page', { timeout: 15000 })
  await page.waitForFunction(
    () => !document.querySelector('.admin-directories-page .el-loading-mask'),
    { timeout: 15000 },
  )
  await page.waitForSelector('.admin-directories-page__tree-node', { timeout: 15000 })
  assert(!page.url().includes('/login'), '应已登录并进入目录结构页')

  const layout = await page.evaluate(() => {
    const workspace = document.querySelector('.admin-workspace')
    const adminPage = document.querySelector('.admin-page')
    const treeCard = document.querySelector('.admin-directories-page__tree-card')
    const tree = document.querySelector('.admin-directories-page__tree')
    return {
      workspaceClass: workspace?.className ?? '',
      pageClass: adminPage?.className ?? '',
      workspaceOverflow: workspace ? getComputedStyle(workspace).overflowY : '',
      pageOverflow: adminPage ? getComputedStyle(adminPage).overflowY : '',
      workspaceClientHeight: workspace?.clientHeight ?? 0,
      workspaceScrollHeight: workspace?.scrollHeight ?? 0,
      treeCardBottom: treeCard?.getBoundingClientRect().bottom ?? 0,
      workspaceBottom: workspace?.getBoundingClientRect().bottom ?? 0,
      treeNodeCount: tree?.querySelectorAll('.admin-directories-page__tree-node').length ?? 0,
    }
  })

  assert(
    !layout.pageClass.includes('admin-page--fill'),
    `目录页不应使用 fill 布局，实际: ${layout.pageClass}`,
  )
  assert(
    !layout.workspaceClass.includes('admin-workspace--fill'),
    `工作区不应使用 fill 样式，实际: ${layout.workspaceClass}`,
  )
  assert(
    layout.workspaceOverflow === 'auto' || layout.workspaceOverflow === 'scroll',
    `工作区 overflow-y 应为 auto/scroll，实际: ${layout.workspaceOverflow}`,
  )
  assert(layout.pageOverflow === 'visible', `admin-page overflow 应为 visible，实际: ${layout.pageOverflow}`)
  assert(layout.treeNodeCount > 0, '页面上应至少有一个目录节点')

  // 展开全部，拉高内容
  const expandBtn = page.getByRole('button', { name: '全部展开' })
  if (await expandBtn.isEnabled()) {
    await expandBtn.click()
    await page.waitForTimeout(300)
  }

  const beforeScroll = await page.evaluate(() => {
    const workspace = document.querySelector('.admin-workspace')
    return {
      scrollTop: workspace?.scrollTop ?? 0,
      scrollHeight: workspace?.scrollHeight ?? 0,
      clientHeight: workspace?.clientHeight ?? 0,
    }
  })

  assert(
    beforeScroll.scrollHeight > beforeScroll.clientHeight,
    `内容应高于工作区可视高度（scroll=${beforeScroll.scrollHeight}, client=${beforeScroll.clientHeight}）`,
  )

  await page.evaluate(() => {
    const workspace = document.querySelector('.admin-workspace')
    if (workspace) workspace.scrollTop = workspace.scrollHeight
  })

  const afterScroll = await page.evaluate(() => {
    const workspace = document.querySelector('.admin-workspace')
    return workspace?.scrollTop ?? 0
  })

  assert(afterScroll > beforeScroll.scrollTop, '工作区 scrollTop 应能增加')

  const wrapped = await page.evaluate(() => {
    const workspace = document.querySelector('.admin-workspace')
    const treeCard = document.querySelector('.admin-directories-page__tree-card')
    if (!workspace || !treeCard) return false
    const w = workspace.getBoundingClientRect()
    const t = treeCard.getBoundingClientRect()
    return t.bottom <= w.bottom + 2 || workspace.scrollTop > 0
  })
  assert(wrapped, '目录树卡片应被工作区完整包裹或可滚动到底部查看')

  await browser.close()
  console.log('✓ 目录结构页工作区滚动测试通过')
  console.log(`  节点数: ${layout.treeNodeCount}`)
  console.log(
    `  工作区尺寸: scrollHeight=${beforeScroll.scrollHeight}, clientHeight=${beforeScroll.clientHeight}`,
  )
}

main().catch((e) => {
  console.error('✗', e.message || e)
  process.exit(1)
})
