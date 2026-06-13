-- 目录树（自引用 parent_id，删除父节点时子节点级联删除）
USE blog;

CREATE TABLE IF NOT EXISTS directories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NULL DEFAULT NULL,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  sort_order INT NULL DEFAULT NULL COMMENT 'Obsidian 目录名数字前缀；NULL 同级排最后',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_dir_parent_name (parent_id, name),
  UNIQUE KEY uk_dir_parent_slug (parent_id, slug),
  KEY idx_directories_parent_id (parent_id),
  CONSTRAINT fk_directories_parent
    FOREIGN KEY (parent_id) REFERENCES directories (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
