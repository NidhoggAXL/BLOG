-- 将 directories 表的 AUTO_INCREMENT 调整为 MAX(id)+1（与现有数据对齐）
-- 适用于：曾把 AUTO_INCREMENT 设得过大、希望新插入 id 紧接当前最大值之后

SET NAMES utf8mb4;

SET @next = (SELECT IFNULL(MAX(id), 0) + 1 FROM directories);
SET @q = CONCAT('ALTER TABLE directories AUTO_INCREMENT = ', @next);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
