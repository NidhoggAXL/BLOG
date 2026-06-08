-- 全功能测试模拟数据（保留 users 表，清空其余业务表后重建）
-- 覆盖：多级目录、draft/published/archived、双链/嵌入/别名/断链/歧义/自环、
--       孤立节点、Callout/代码块/TOC、站点资料字段、仪表盘统计样本
-- 前置：已执行 db/00~09 schema；USE 与 .env 中 MYSQL_DATABASE 一致的库
-- RAG embedding：执行本脚本后请运行 npm run test:ai 或 POST /api/ai/embed/rebuild

SET NAMES utf8mb4;

-- post_aliases 表（若尚未迁移）
CREATE TABLE IF NOT EXISTS post_aliases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  alias VARCHAR(191) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_post_aliases_alias (alias),
  KEY idx_post_aliases_post (post_id),
  CONSTRAINT fk_post_aliases_post FOREIGN KEY (post_id) REFERENCES posts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE post_embeddings;
TRUNCATE TABLE post_wikilinks;
TRUNCATE TABLE post_aliases;
TRUNCATE TABLE posts;
TRUNCATE TABLE directories;
SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE directories AUTO_INCREMENT = 1;
ALTER TABLE posts AUTO_INCREMENT = 1;
ALTER TABLE post_wikilinks AUTO_INCREMENT = 1;
ALTER TABLE post_aliases AUTO_INCREMENT = 1;
ALTER TABLE post_embeddings AUTO_INCREMENT = 1;

-- ========== 目录树（3 一级 + 5 二级 + 3 三级）==========
INSERT INTO directories (id, parent_id, name, slug, sort_order, materialized_path) VALUES
  (1, NULL, '工作',   'work',     0,  '/work'),
  (2, NULL, '学习',   'study',   10,  '/study'),
  (3, NULL, '生活',   'life',    20,  '/life'),
  (4, 1,    '项目',   'projects', 0,  '/work/projects'),
  (5, 1,    '会议',   'meetings', 10, '/work/meetings'),
  (6, 2,    '笔记',   'notes',    0,  '/study/notes'),
  (7, 2,    '课程',   'courses',  10, '/study/courses'),
  (8, 3,    '日记',   'diary',    0,  '/life/diary'),
  (9, 4,    '子项目A', 'subproject-a', 0, '/work/projects/subproject-a'),
  (10, 6,   '章节一', 'chapter-one',  0, '/study/notes/chapter-one'),
  (11, 8,   '2025',   'y2025',    0,  '/life/diary/y2025');

ALTER TABLE directories AUTO_INCREMENT = 12;

-- ========== 文章（含 Markdown 特性样本）==========
INSERT INTO posts (id, directory_id, slug, title, body, status, published_at, created_at, updated_at) VALUES
(1, 6, 'hello-world', '第一篇：Hello World',
 CONCAT(
   '# Hello World', CHAR(10), CHAR(10),
   '> [!note] 提示', CHAR(10),
   '> 这是 Obsidian 风格 Callout 示例。', CHAR(10), CHAR(10),
   '欢迎来到 **blog-com** 知识库。', CHAR(10), CHAR(10),
   '## 相关阅读', CHAR(10),
   '- [[weekly-report]]', CHAR(10),
   '- [[vue-notes]]', CHAR(10), CHAR(10),
   '```ts', CHAR(10),
   'const greeting = ''Hello World''', CHAR(10),
   'console.log(greeting)', CHAR(10),
   '```'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 60 DAY), DATE_SUB(NOW(3), INTERVAL 60 DAY), NOW(3)),

(2, 4, 'weekly-report', '项目周报 2025-W20',
 CONCAT(
   '# 周报', CHAR(10), CHAR(10),
   '- 本周完成需求评审', CHAR(10),
   '- 联调 [[hello-world]] 中的示例接口', CHAR(10),
   '- 别名链接：[[weekly-report|本周周报]]'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 45 DAY), DATE_SUB(NOW(3), INTERVAL 45 DAY), NOW(3)),

(3, 6, 'vue-notes', 'Vue 3 组合式笔记',
 CONCAT(
   '# Vue 笔记', CHAR(10), CHAR(10),
   '```vue', CHAR(10),
   '<script setup lang="ts">', CHAR(10),
   'import { ref } from ''vue''', CHAR(10),
   'const count = ref(0)', CHAR(10),
   '</script>', CHAR(10),
   '```', CHAR(10), CHAR(10),
   '延伸阅读：[[obsidian-links]]'
 ),
 'draft', NULL, DATE_SUB(NOW(3), INTERVAL 30 DAY), NOW(3)),

(4, 6, 'obsidian-links', 'Obsidian 式双链备忘',
 CONCAT(
   '# 链接与嵌入', CHAR(10), CHAR(10),
   '内链：[[hello-world]]', CHAR(10),
   '带显示文本：[[weekly-report|本周周报]]', CHAR(10),
   '嵌入预览：', CHAR(10),
   '![[hello-world]]', CHAR(10), CHAR(10),
   '> [!warning] 注意', CHAR(10),
   '> 嵌入块需目标文章已发布。'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 40 DAY), DATE_SUB(NOW(3), INTERVAL 40 DAY), NOW(3)),

(5, 11, 'travel-2025', '2025 旅行随记',
 CONCAT(
   '# 旅行', CHAR(10), CHAR(10),
   '今日索引：[[diary-index]]', CHAR(10), CHAR(10),
   '## 行程', CHAR(10),
   '1. 出发', CHAR(10),
   '2. 返程'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 15 DAY), DATE_SUB(NOW(3), INTERVAL 15 DAY), NOW(3)),

(6, 8, 'diary-index', '日记索引',
 CONCAT(
   '# 日记', CHAR(10), CHAR(10),
   '- [[travel-2025]]', CHAR(10),
   '- 草稿条目待补充'
 ),
 'draft', NULL, DATE_SUB(NOW(3), INTERVAL 10 DAY), NOW(3)),

(7, NULL, 'readme-cms', 'CMS 使用说明（未归类）',
 CONCAT(
   '# 说明', CHAR(10), CHAR(10),
   '本篇文章 `directory_id` 为 NULL，表示未归入任何目录。', CHAR(10),
   '可在后台文章库中修改所属目录。'
 ),
 'draft', NULL, DATE_SUB(NOW(3), INTERVAL 5 DAY), NOW(3)),

(8, 7, 'course-outline', '课程大纲（已归档）',
 CONCAT('# 大纲', CHAR(10), CHAR(10), '状态为 **archived** 的示例，公开展示不可见。'),
 'archived', DATE_SUB(NOW(3), INTERVAL 90 DAY), DATE_SUB(NOW(3), INTERVAL 90 DAY), NOW(3)),

(9, 10, 'orphan-note', '孤立节点（无链接）',
 CONCAT(
   '# 孤立笔记', CHAR(10), CHAR(10),
   '本篇无任何 wikilink 出链或入链，用于知识图谱「孤立节点」测试。', CHAR(10), CHAR(10),
   '纯文本内容，便于验证 showOrphans 开关。'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 20 DAY), DATE_SUB(NOW(3), INTERVAL 20 DAY), NOW(3)),

(10, 6, 'link-health-demo', '双链健康度样本',
 CONCAT(
   '# 链接健康', CHAR(10), CHAR(10),
   '正常链接：[[hello-world]]', CHAR(10),
   '断链示例：[[ghost-page-not-exist]]', CHAR(10),
   '自环示例：[[link-health-demo]]', CHAR(10),
   '歧义示例（由 seed 手动写入 ambiguous 边）：[[conflict-target]]'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 25 DAY), DATE_SUB(NOW(3), INTERVAL 25 DAY), NOW(3)),

(11, 6, 'graph-hub', '知识图谱枢纽',
 CONCAT(
   '# 图谱枢纽', CHAR(10), CHAR(10),
   '连接多篇已发布文章，便于 D3 力导向图测试：', CHAR(10), CHAR(10),
   '- [[hello-world]]', CHAR(10),
   '- [[weekly-report]]', CHAR(10),
   '- [[obsidian-links]]', CHAR(10),
   '- [[nuxt-overview]]', CHAR(10),
   '- [[mysql-notes]]'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 7 DAY), DATE_SUB(NOW(3), INTERVAL 7 DAY), NOW(3)),

(12, 6, 'nuxt-overview', 'Nuxt 3 全栈概览',
 CONCAT(
   '# Nuxt 3 概览', CHAR(10), CHAR(10),
   'blog-com 基于 Nuxt 3 构建，采用 **file-based routing** 与 **server/api** 目录。', CHAR(10), CHAR(10),
   '## 特性', CHAR(10),
   '- SSR + SPA 混合', CHAR(10),
   '- Pinia 状态管理', CHAR(10),
   '- Element Plus UI', CHAR(10), CHAR(10),
   '相关：[[markdown-features]]、[[hello-world]]'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 3 DAY), DATE_SUB(NOW(3), INTERVAL 3 DAY), NOW(3)),

(13, 6, 'mysql-notes', 'MySQL 与双链存储',
 CONCAT(
   '# MySQL 笔记', CHAR(10), CHAR(10),
   '文章存于 `posts` 表，双链边存于 `post_wikilinks` 表。', CHAR(10),
   '保存文章时会自动同步 wikilink 出链。', CHAR(10), CHAR(10),
   '参见 [[obsidian-links]]。'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 2 DAY), DATE_SUB(NOW(3), INTERVAL 2 DAY), NOW(3)),

(14, 6, 'markdown-features', 'Markdown 渲染特性',
 CONCAT(
   '# Markdown 特性', CHAR(10), CHAR(10),
   '## 二级标题', CHAR(10),
   '用于 TOC 目录测试。', CHAR(10), CHAR(10),
   '### 三级标题', CHAR(10), CHAR(10),
   '> [!tip] 技巧', CHAR(10),
   '> marked + Shiki 统一渲染管线。', CHAR(10), CHAR(10),
   '```js', CHAR(10),
   'export function hello() { return ''world'' }', CHAR(10),
   '```', CHAR(10), CHAR(10),
   '双链：[[nuxt-overview]]'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 1 DAY), DATE_SUB(NOW(3), INTERVAL 1 DAY), NOW(3)),

(15, 2, 'mulu', '目录.md',
 CONCAT(
   '# 学习目录', CHAR(10), CHAR(10),
   '文库根目录索引，对应「学习」一级目录。', CHAR(10), CHAR(10),
   '- [[vue-notes]]', CHAR(10),
   '- [[nuxt-overview]]', CHAR(10),
   '- [[mysql-notes]]'
 ),
 'published', DATE_SUB(NOW(3), INTERVAL 50 DAY), DATE_SUB(NOW(3), INTERVAL 50 DAY), NOW(3));

ALTER TABLE posts AUTO_INCREMENT = 16;

-- ========== 文章别名（[[别名]] 解析）==========
INSERT INTO post_aliases (post_id, alias) VALUES
  (2, '本周周报'),
  (2, 'W20'),
  (12, 'Nuxt概览');

-- ========== 双链边（含 ok / missing / self_loop / ambiguous / embed）==========
INSERT INTO post_wikilinks
  (source_post_id, target_post_id, raw_target, link_display, link_kind, anchor, position, resolve_status)
VALUES
  -- hello-world
  (1, 2, 'weekly-report', NULL, 'link', NULL, 0, 'ok'),
  (1, 3, 'vue-notes', NULL, 'link', NULL, 1, 'ok'),
  -- weekly-report
  (2, 1, 'hello-world', NULL, 'link', NULL, 0, 'ok'),
  (2, 2, 'weekly-report', '本周周报', 'link', NULL, 1, 'ok'),
  -- vue-notes
  (3, 4, 'obsidian-links', NULL, 'link', NULL, 0, 'ok'),
  -- obsidian-links
  (4, 1, 'hello-world', NULL, 'link', NULL, 0, 'ok'),
  (4, 2, 'weekly-report', '本周周报', 'link', NULL, 1, 'ok'),
  (4, 1, 'hello-world', NULL, 'embed', NULL, 2, 'ok'),
  -- travel / diary
  (5, 6, 'diary-index', NULL, 'link', NULL, 0, 'ok'),
  (6, 5, 'travel-2025', NULL, 'link', NULL, 0, 'ok'),
  -- link-health-demo
  (10, 1, 'hello-world', NULL, 'link', NULL, 0, 'ok'),
  (10, NULL, 'ghost-page-not-exist', NULL, 'link', NULL, 1, 'missing_target'),
  (10, 10, 'link-health-demo', NULL, 'link', NULL, 2, 'self_loop'),
  (10, NULL, 'conflict-target', NULL, 'link', NULL, 3, 'ambiguous'),
  -- graph-hub
  (11, 1, 'hello-world', NULL, 'link', NULL, 0, 'ok'),
  (11, 2, 'weekly-report', NULL, 'link', NULL, 1, 'ok'),
  (11, 4, 'obsidian-links', NULL, 'link', NULL, 2, 'ok'),
  (11, 12, 'nuxt-overview', NULL, 'link', NULL, 3, 'ok'),
  (11, 13, 'mysql-notes', NULL, 'link', NULL, 4, 'ok'),
  -- nuxt / mysql / markdown / mulu
  (12, 14, 'markdown-features', NULL, 'link', NULL, 0, 'ok'),
  (12, 1, 'hello-world', NULL, 'link', NULL, 1, 'ok'),
  (13, 4, 'obsidian-links', NULL, 'link', NULL, 0, 'ok'),
  (14, 12, 'nuxt-overview', NULL, 'link', NULL, 0, 'ok'),
  (15, 3, 'vue-notes', NULL, 'link', NULL, 0, 'ok'),
  (15, 12, 'nuxt-overview', NULL, 'link', NULL, 1, 'ok'),
  (15, 13, 'mysql-notes', NULL, 'link', NULL, 2, 'ok');

-- ========== 站点主账号公开资料（/api/public/site-profile）==========
UPDATE users SET
  display_name = COALESCE(display_name, 'Nidhoog'),
  bio = '全栈开发者，维护 blog-com 个人知识库与博客。专注 Nuxt、Vue 与 Obsidian 式双链笔记。',
  avatar_url = 'https://avatars.githubusercontent.com/u/9919?s=200&v=4',
  github_url = 'https://github.com/nuxt',
  gitee_url = 'https://gitee.com',
  website_url = 'https://nuxt.com'
WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM users) AS t);

-- ========== 汇总 ==========
SELECT 'directories' AS tbl, COUNT(*) AS cnt FROM directories
UNION ALL SELECT 'posts', COUNT(*) FROM posts
UNION ALL SELECT 'post_wikilinks', COUNT(*) FROM post_wikilinks
UNION ALL SELECT 'post_aliases', COUNT(*) FROM post_aliases
UNION ALL SELECT 'users', COUNT(*) FROM users;

SELECT status, COUNT(*) AS cnt FROM posts GROUP BY status;
SELECT resolve_status, COUNT(*) AS cnt FROM post_wikilinks GROUP BY resolve_status;
