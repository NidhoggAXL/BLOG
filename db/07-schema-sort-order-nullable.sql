-- sort_order 改为 NULL = 无 Obsidian 数字前缀，排序时排最后（需 MySQL 5.7+）
USE blog;

ALTER TABLE posts
  MODIFY COLUMN sort_order INT NULL DEFAULT NULL
    COMMENT 'Obsidian 文件名/标题数字前缀；NULL 表示无前缀，同级排最后';

ALTER TABLE directories
  MODIFY COLUMN sort_order INT NULL DEFAULT NULL
    COMMENT 'Obsidian 目录名数字前缀；NULL 表示无前缀，同级排最后';

UPDATE posts SET sort_order = NULL WHERE sort_order = 0;
UPDATE directories SET sort_order = NULL WHERE sort_order = 0;
