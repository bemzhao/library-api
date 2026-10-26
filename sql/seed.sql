-- 初始数据：让你一启动就能查到东西

INSERT INTO authors (name) VALUES
  ('刘慈欣'), ('余华'), ('村上春树');

INSERT INTO genres (name) VALUES
  ('科幻'), ('文学'), ('小说');

INSERT INTO books (title, author_id, summary) VALUES
  ('三体', 1, '地球文明与三体文明的第一次接触。'),
  ('活着', 2, '福贵的一生。'),
  ('挪威的森林', 3, '渡边与两个女孩的青春故事。');

INSERT INTO book_genres (book_id, genre_id) VALUES
  (1, 1),          -- 三体 → 科幻
  (2, 2),          -- 活着 → 文学
  (3, 2), (3, 3);  -- 挪威的森林 → 文学、小说

INSERT INTO book_instances (book_id) VALUES
  (1), (1),  -- 三体 2 本
  (2), (2),  -- 活着 2 本
  (3);       -- 挪威的森林 1 本

INSERT INTO members (name, email) VALUES
  ('张三', 'zhangsan@example.com'),
  ('李四', 'lisi@example.com');

-- 张三借了《三体》第 1 本，30 天后到期
INSERT INTO loans (book_instance_id, member_id, due_at)
VALUES (1, 1, datetime('now', '+30 days'));

-- 副本状态要和借阅记录保持一致：借出中的副本不能是 available
UPDATE book_instances SET status = 'borrowed' WHERE id = 1;
