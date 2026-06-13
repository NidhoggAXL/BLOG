-- 一键初始化全部表结构（在项目根目录执行）
-- mysql -u root -p < db/00-init-all.sql

CREATE DATABASE IF NOT EXISTS blog
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  directory_id BIGINT UNSIGNED NULL DEFAULT NULL,
  sort_order INT NULL DEFAULT NULL COMMENT 'Obsidian 文件名/标题数字前缀；NULL 同级排最后',
  slug VARCHAR(191) NOT NULL,
  title VARCHAR(191) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  published_at DATETIME(3) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_posts_slug (slug),
  KEY idx_posts_directory_id (directory_id),
  KEY idx_posts_directory_sort (directory_id, sort_order),
  KEY idx_posts_status (status),
  KEY idx_posts_published_at (published_at),
  CONSTRAINT fk_posts_directory
    FOREIGN KEY (directory_id) REFERENCES directories (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_aliases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  alias VARCHAR(191) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_post_aliases_alias (alias),
  KEY idx_post_aliases_post_id (post_id),
  CONSTRAINT fk_post_aliases_post
    FOREIGN KEY (post_id) REFERENCES posts (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_wikilinks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_post_id BIGINT UNSIGNED NOT NULL,
  target_post_id BIGINT UNSIGNED NULL DEFAULT NULL,
  raw_target VARCHAR(512) NOT NULL,
  link_display VARCHAR(512) NULL DEFAULT NULL,
  link_kind ENUM('link', 'embed') NOT NULL DEFAULT 'link',
  anchor VARCHAR(191) NULL DEFAULT NULL,
  position INT NOT NULL DEFAULT 0,
  resolve_status ENUM('ok', 'missing_target', 'ambiguous', 'self_loop') NOT NULL DEFAULT 'ok',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_wikilinks_source (source_post_id),
  KEY idx_wikilinks_target (target_post_id),
  KEY idx_wikilinks_resolve_status (resolve_status),
  CONSTRAINT fk_wikilinks_source
    FOREIGN KEY (source_post_id) REFERENCES posts (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_wikilinks_target
    FOREIGN KEY (target_post_id) REFERENCES posts (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt',
  display_name VARCHAR(255) NULL DEFAULT NULL,
  email VARCHAR(191) NULL DEFAULT NULL,
  bio TEXT NULL,
  avatar_url VARCHAR(500) NULL DEFAULT NULL,
  github_url VARCHAR(500) NULL DEFAULT NULL,
  gitee_url VARCHAR(500) NULL DEFAULT NULL,
  website_url VARCHAR(500) NULL DEFAULT NULL,
  last_login_at DATETIME(3) NULL DEFAULT NULL,
  password_changed_at DATETIME(3) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_embeddings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  embedding JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_post_embeddings_chunk (post_id, chunk_index),
  KEY idx_post_embeddings_post_id (post_id),
  CONSTRAINT fk_post_embeddings_post
    FOREIGN KEY (post_id) REFERENCES posts (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
