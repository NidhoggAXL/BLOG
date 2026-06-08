-- 同一父级下 name/slug 唯一；parent_id IS NULL 的顶级目录视为同一父级
-- 执行前请 USE 你的业务库
--
-- MySQL 对 UNIQUE(parent_id, …) 中 NULL 不判重，故用生成列 parent_id_key = COALESCE(parent_id, 0)
--
-- 查找重复（含顶级 NULL 父级）：
-- SELECT COALESCE(parent_id, 0) AS parent_key, name, COUNT(*) AS cnt
-- FROM directories
-- GROUP BY parent_key, name
-- HAVING cnt > 1;
--
-- SELECT COALESCE(parent_id, 0) AS parent_key, slug, COUNT(*) AS cnt
-- FROM directories
-- GROUP BY parent_key, slug
-- HAVING cnt > 1;

ALTER TABLE directories
  ADD COLUMN parent_id_key BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(parent_id, 0)) STORED;

ALTER TABLE directories
  DROP INDEX uk_dir_parent_slug;

-- 若曾单独加过 (parent_id, name) 唯一索引且存在，请取消下一行注释后执行
-- ALTER TABLE directories DROP INDEX uk_dir_parent_name;

ALTER TABLE directories
  ADD UNIQUE KEY uk_dir_parent_slug (parent_id_key, slug),
  ADD UNIQUE KEY uk_dir_parent_name (parent_id_key, name);
