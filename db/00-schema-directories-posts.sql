-- 最小表结构：目录树 + 文章（用于文库 / 目录.md）
-- 请先创建库：CREATE DATABASE IF NOT EXISTS blog_cms DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 然后：USE blog_cms; 再执行本文件与 01-seed-*.sql

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS directories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NULL DEFAULT NULL,
  parent_id_key BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(parent_id, 0)) STORED
    COMMENT 'NULL 父级归一为 0，顶级目录在唯一索引中与同一父级一致',
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  materialized_path VARCHAR(512) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_dir_parent_slug (parent_id_key, slug),
  UNIQUE KEY uk_dir_parent_name (parent_id_key, name),
  KEY idx_dir_parent (parent_id),
  KEY idx_dir_path (materialized_path(191)),
  CONSTRAINT fk_dir_parent FOREIGN KEY (parent_id) REFERENCES directories (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  directory_id BIGINT UNSIGNED NULL DEFAULT NULL,
  slug VARCHAR(191) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  published_at DATETIME(3) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_posts_slug (slug),
  KEY idx_posts_directory (directory_id),
  KEY idx_posts_status_updated (status, updated_at),
  CONSTRAINT fk_posts_directory FOREIGN KEY (directory_id) REFERENCES directories (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
