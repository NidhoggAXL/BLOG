-- RAG 向量索引：已发布文章分块 embedding（需 Ollama embed 模型）
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS post_embeddings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding JSON NOT NULL COMMENT '浮点向量数组',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_post_chunk (post_id, chunk_index),
  KEY idx_post_embeddings_post (post_id),
  CONSTRAINT fk_post_embeddings_post FOREIGN KEY (post_id) REFERENCES posts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
