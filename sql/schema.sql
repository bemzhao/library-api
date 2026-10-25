-- ============================================
-- 图书馆数据库：7 张表
-- 每次执行 db:reset 都会删库重建，可以随便试
-- ============================================

PRAGMA foreign_keys = ON;

-- 1. 作者
CREATE TABLE authors (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL
);

-- 2. 分类
CREATE TABLE genres (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE
);

-- 3. 书（一本书对应一个作者）
CREATE TABLE books (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  author_id  INTEGER NOT NULL REFERENCES authors(id),
  summary    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. 书 ↔ 分类：多对多靠这张"中间表"
CREATE TABLE book_genres (
  book_id  INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, genre_id)
);

-- 5. 馆藏副本：同一本书可以有多个实体
CREATE TABLE book_instances (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status  TEXT NOT NULL DEFAULT 'available'
          CHECK (status IN ('available', 'borrowed', 'lost'))
);

-- 6. 会员
CREATE TABLE members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. 借阅记录
CREATE TABLE loans (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  book_instance_id INTEGER NOT NULL REFERENCES book_instances(id),
  member_id        INTEGER NOT NULL REFERENCES members(id),
  borrowed_at      TEXT NOT NULL DEFAULT (datetime('now')),
  due_at           TEXT NOT NULL,
  returned_at      TEXT
);

-- 核心规则：同一本副本，最多只能有一条"未归还"的借阅记录
-- 这条规则由数据库自己保证，代码写错了也插不进去
CREATE UNIQUE INDEX one_active_loan_per_instance
  ON loans(book_instance_id)
  WHERE returned_at IS NULL;

-- 常用查询的索引
CREATE INDEX idx_books_author ON books(author_id);
CREATE INDEX idx_loans_member ON loans(member_id);
CREATE INDEX idx_loans_due ON loans(due_at) WHERE returned_at IS NULL;
