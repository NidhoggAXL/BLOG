-- 目录种子：无「库根」占位行，一级目录 parent_id 为 NULL
-- 结构：3 个一级 + 5 个二级 + 3 个三级 = 共 11 行
-- 执行前请先 USE 你的业务库；若表非空可按需 TRUNCATE TABLE directories;

SET NAMES utf8mb4;

-- 一级（3）：parent_id IS NULL
-- 二级（5）：2+2+1 挂在一级下
-- 三级（3）：分别挂在三个不同的二级下

INSERT INTO directories (id, parent_id, name, slug, sort_order) VALUES
  (1, NULL, '工作', 'work', 0),
  (2, NULL, '学习', 'study', 10),
  (3, NULL, '生活', 'life', 20),
  (4, 1, '项目', 'projects', 0),
  (5, 1, '会议', 'meetings', 10),
  (6, 2, '笔记', 'notes', 0),
  (7, 2, '课程', 'courses', 10),
  (8, 3, '日记', 'diary', 0),
  (9, 4, '子项目A', 'subproject-a', 0),
  (10, 6, '章节一', 'chapter-one', 0),
  (11, 8, '2025', 'y2025', 0);

ALTER TABLE directories AUTO_INCREMENT = 12;
