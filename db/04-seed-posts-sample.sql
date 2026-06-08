-- 向 posts 表插入示例文章（Markdown + 双链占位写法 [[slug]]）
-- 前置：已执行 db/00-schema-directories-posts.sql，且目录与 db/03-seed-directories-no-root.sql 一致
--   一级：id 1 工作 / 2 学习 / 3 生活
--   常用挂载：6=笔记(notes) / 8=日记(diary) / 7=课程(courses) / NULL=未归类
-- 执行前：USE 你的库名;

SET NAMES utf8mb4;

-- 1) 已发布：挂在「笔记」下，正文含指向其他 slug 的 wikilink（需存在对应 posts.slug 才可在解析时命中）
INSERT INTO posts (directory_id, slug, title, body, status, published_at)
SELECT
  6,
  'hello-world',
  '第一篇：Hello World',
  CONCAT(
    '# Hello World', CHAR(10), CHAR(10),
    '欢迎来到博客 CMS。', CHAR(10), CHAR(10),
    '相关阅读：[[weekly-report]]、[[vue-notes]]', CHAR(10)
  ),
  'published',
  NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'hello-world');

-- 2) 已发布：周报，挂在「工作 → 项目」下
INSERT INTO posts (directory_id, slug, title, body, status, published_at)
SELECT
  4,
  'weekly-report',
  '项目周报 2025-W20',
  CONCAT(
    '# 周报', CHAR(10), CHAR(10),
    '- 本周完成需求评审', CHAR(10),
    '- 下周联调 [[hello-world]] 中的示例接口', CHAR(10)
  ),
  'published',
  NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'weekly-report');

-- 3) 草稿：Vue 笔记，挂在「学习 → 笔记」
INSERT INTO posts (directory_id, slug, title, body, status, published_at)
SELECT
  6,
  'vue-notes',
  'Vue 3 组合式笔记',
  CONCAT(
    '# Vue 笔记', CHAR(10), CHAR(10),
    '```ts', CHAR(10),
    'const x = ref(0)', CHAR(10),
    '```', CHAR(10), CHAR(10),
    '延伸阅读：[[obsidian-links]]', CHAR(10)
  ),
  'draft',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'vue-notes');

-- 4) 已发布：双链与嵌入写法示例（嵌入目标需存在对应 slug 的文章）
INSERT INTO posts (directory_id, slug, title, body, status, published_at)
SELECT
  6,
  'obsidian-links',
  'Obsidian 式链接备忘',
  CONCAT(
    '# 链接', CHAR(10), CHAR(10),
    '内链：[[hello-world]]', CHAR(10),
    '别名：[[weekly-report|本周周报]]', CHAR(10),
    '嵌入（若产品支持）：![[hello-world]]', CHAR(10)
  ),
  'published',
  NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'obsidian-links');

-- 5) 已发布：日记，挂在「生活 → 日记 → 2025」
INSERT INTO posts (directory_id, slug, title, body, status, published_at)
SELECT
  11,
  'travel-2025',
  '2025 旅行随记',
  CONCAT(
    '# 旅行', CHAR(10), CHAR(10),
    '今日链接：[[diary-index]]', CHAR(10)
  ),
  'published',
  NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'travel-2025');

-- 6) 草稿：日记索引，挂在「生活 → 日记」
INSERT INTO posts (directory_id, slug, title, body, status, published_at)
SELECT
  8,
  'diary-index',
  '日记索引',
  CONCAT(
    '# 日记', CHAR(10), CHAR(10),
    '- [[travel-2025]]', CHAR(10)
  ),
  'draft',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'diary-index');

-- 7) 未归类（directory_id IS NULL）：归档说明
INSERT INTO posts (directory_id, slug, title, body, status, published_at)
SELECT
  NULL,
  'readme-cms',
  'CMS 使用说明（未归类）',
  CONCAT(
    '# 说明', CHAR(10), CHAR(10),
    '本行 `directory_id` 为 NULL，表示未归入任何目录。', CHAR(10),
    '需要归类时，在后台改 `directory_id` 即可。', CHAR(10)
  ),
  'draft',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'readme-cms');

-- 8) 已下线：课程下的一篇
INSERT INTO posts (directory_id, slug, title, body, status, published_at)
SELECT
  7,
  'course-outline',
  '课程大纲（已下线示例）',
  CONCAT('# 大纲', CHAR(10), CHAR(10), '状态为 archived 的示例。', CHAR(10)),
  'archived',
  DATE_SUB(NOW(3), INTERVAL 30 DAY)
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'course-outline');

-- 自增接续（可按当前最大 id 调整）
-- ALTER TABLE posts AUTO_INCREMENT = 100;
