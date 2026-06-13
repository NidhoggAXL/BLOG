-- 文章 Obsidian 排序字段（与 directories.sort_order 一致：从 01_ 等前缀解析）
USE blog;

ALTER TABLE posts
  ADD COLUMN sort_order INT NULL DEFAULT NULL COMMENT 'Obsidian 数字前缀；NULL 同级排最后' AFTER directory_id,
  ADD KEY idx_posts_directory_sort (directory_id, sort_order);
