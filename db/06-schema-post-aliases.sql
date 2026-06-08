-- 文章别名：[[别名]] 可解析到 posts（见 .cursor/rules/mysql-wikilink-bidirectional-schema.mdc）
-- 前置：已执行 db/00-schema-directories-posts.sql

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS post_aliases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  alias VARCHAR(191) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_post_aliases_alias (alias),
  KEY idx_post_aliases_post (post_id),
  CONSTRAINT fk_post_aliases_post FOREIGN KEY (post_id) REFERENCES posts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='维基链接别名；解析时 slug 未命中再匹配 alias';
