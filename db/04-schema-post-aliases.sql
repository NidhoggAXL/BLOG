-- 文章别名（Wikilink 解析时除 slug 外还可匹配 alias）
USE blog;

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
