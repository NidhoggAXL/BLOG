-- 从 slug 末段回填 posts.sort_order（MySQL 8.0+；无前缀则为 NULL）
USE blog;

UPDATE posts
SET sort_order = CAST(
  REGEXP_SUBSTR(SUBSTRING_INDEX(slug, '/', -1), '^[0-9]+') AS UNSIGNED
)
WHERE REGEXP_SUBSTR(SUBSTRING_INDEX(slug, '/', -1), '^[0-9]+') IS NOT NULL;

UPDATE posts SET sort_order = NULL WHERE sort_order = 0;
