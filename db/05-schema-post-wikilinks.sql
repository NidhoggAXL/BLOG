-- 文章双链边表（Wikilink 出链 / 入链）
USE blog;

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
