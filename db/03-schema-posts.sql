-- 文章表
USE blog;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  directory_id BIGINT UNSIGNED NULL DEFAULT NULL,
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
  KEY idx_posts_status (status),
  KEY idx_posts_published_at (published_at),
  CONSTRAINT fk_posts_directory
    FOREIGN KEY (directory_id) REFERENCES directories (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
