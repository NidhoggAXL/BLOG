-- 目录 name 仅作展示：移除同级 name 唯一约束，并对已有 name 去 Obsidian 排序前缀（slug 不变）
-- 可重复执行：索引已删除时跳过 DROP
USE blog;

SET @drop_name_uk := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'directories'
    AND index_name = 'uk_dir_parent_name'
);

SET @drop_sql := IF(
  @drop_name_uk > 0,
  'ALTER TABLE directories DROP INDEX uk_dir_parent_name',
  'SELECT 1'
);

PREPARE drop_stmt FROM @drop_sql;
EXECUTE drop_stmt;
DEALLOCATE PREPARE drop_stmt;

UPDATE directories
SET name = TRIM(REGEXP_REPLACE(name, '^[0-9]+([[:space:]_-]+|\\.)', ''))
WHERE name REGEXP '^[0-9]+([[:space:]_-]+|\\.)'
  AND TRIM(REGEXP_REPLACE(name, '^[0-9]+([[:space:]_-]+|\\.)', '')) <> '';
