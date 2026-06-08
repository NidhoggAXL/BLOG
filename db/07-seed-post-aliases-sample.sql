-- 示例别名（需 posts.slug = weekly-report 已存在，见 db/04-seed-posts-sample.sql）
-- USE your_database;

SET NAMES utf8mb4;

INSERT INTO post_aliases (post_id, alias)
SELECT p.id, '本周周报'
FROM posts p
WHERE p.slug = 'weekly-report'
  AND NOT EXISTS (SELECT 1 FROM post_aliases WHERE LOWER(alias) = LOWER('本周周报'))
LIMIT 1;

INSERT INTO post_aliases (post_id, alias)
SELECT p.id, 'W20'
FROM posts p
WHERE p.slug = 'weekly-report'
  AND NOT EXISTS (SELECT 1 FROM post_aliases WHERE LOWER(alias) = LOWER('W20'))
LIMIT 1;
