-- 多级目录示例（含占位根 1）+ 根下「目录.md」对应 posts 一行
-- 前置：已 USE blog_cms; 且已执行 00-schema-directories-posts.sql
-- 结构示意：
--   库根 _library (id=1)
--   ├── 笔记 notes (2)
--   │     └── 日记 diary (5)
--   │           └── 2025 y2025 (6)
--   ├── 草稿箱 drafts (3)
--   └── 资源库 assets (4)
-- 共 5 个业务目录（不含库根）；含 3 级深度

SET NAMES utf8mb4;

INSERT INTO directories (id, parent_id, name, slug, sort_order) VALUES
  (1, NULL, '库根', '_library', 0),
  (2, 1, '笔记', 'notes', 0),
  (3, 1, '草稿箱', 'drafts', 10),
  (4, 1, '资源库', 'assets', 20),
  (5, 2, '日记', 'diary', 0),
  (6, 5, '2025', 'y2025', 0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  slug = VALUES(slug),
  parent_id = VALUES(parent_id),
  sort_order = VALUES(sort_order);

-- 新插入目录 id 从 7 起连续递增（种子固定 id 为 1~6）
-- 若库中曾用过 AUTO_INCREMENT=100，可执行 db/02-autoincrement-sync.sql 对齐为 MAX(id)+1
ALTER TABLE directories AUTO_INCREMENT = 7;

-- 根目录下的「目录」页：slug 唯一，正文为 Markdown 目录树
INSERT INTO posts (directory_id, slug, title, body, status)
SELECT
  1,
  'mulu',
  '目录',
  CONCAT(
    '# 目录', CHAR(10), CHAR(10),
    '自动生成的多级目录示例：', CHAR(10), CHAR(10),
    '- 笔记 `notes/`', CHAR(10),
    '  - 日记 `diary/`', CHAR(10),
    '    - 2025 `y2025/`', CHAR(10),
    '- 草稿箱 `drafts/`', CHAR(10),
    '- 资源库 `assets/`', CHAR(10)
  ),
  'draft'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'mulu');
