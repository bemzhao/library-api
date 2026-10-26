import express from 'express';
import db from './db.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// 健康检查：确认服务活着
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// 图书列表：GET /books?page=1&pageSize=10
app.get('/books', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
  const offset = (page - 1) * pageSize;

  // 总数，用来算总页数
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM books').get();

  // 联表查作者，再用子查询把分类拼成字符串
  const rows = db
    .prepare(
      `SELECT
         b.id,
         b.title,
         a.name AS author,
         b.summary,
         (
           SELECT GROUP_CONCAT(g.name, '、')
           FROM book_genres bg
           JOIN genres g ON g.id = bg.genre_id
           WHERE bg.book_id = b.id
         ) AS genres
       FROM books b
       JOIN authors a ON a.id = b.author_id
       ORDER BY b.id
       LIMIT ? OFFSET ?`
    )
    .all(pageSize, offset);

  res.json({
    data: rows.map((row) => ({
      ...row,
      genres: row.genres ? row.genres.split('、') : [],
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// 带 HTTP 状态码的错误，方便在事务里抛出、在最外层统一转成响应
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// 借书：POST /loans
app.post('/loans', (req, res) => {
  const { memberId, bookInstanceId, days = 30 } = req.body ?? {};

  if (
    !Number.isInteger(memberId) ||
    !Number.isInteger(bookInstanceId) ||
    !Number.isInteger(days) ||
    days < 1
  ) {
    return res.status(400).json({
      error: '参数不合法：memberId、bookInstanceId 必填，days 为正整数',
    });
  }

  // 整个借书流程放进一个事务：任何一步抛错，前面的改动全部回滚
  const borrow = db.transaction(() => {
    const member = db.prepare('SELECT id FROM members WHERE id = ?').get(memberId);
    if (!member) throw httpError(404, '会员不存在');

    const instance = db
      .prepare('SELECT id, status FROM book_instances WHERE id = ?')
      .get(bookInstanceId);
    if (!instance) throw httpError(404, '副本不存在');

    // 先查有没有未归还的借阅，给出比数据库报错更友好的提示
    const active = db
      .prepare('SELECT id FROM loans WHERE book_instance_id = ? AND returned_at IS NULL')
      .get(bookInstanceId);
    if (active) throw httpError(409, '该副本已借出');

    // 条件更新：只有 available 才能借，防止状态被别的流程改过
    const updated = db
      .prepare("UPDATE book_instances SET status = 'borrowed' WHERE id = ? AND status = 'available'")
      .run(bookInstanceId);
    if (updated.changes === 0) throw httpError(409, '副本当前不可借');

    const info = db
      .prepare(
        "INSERT INTO loans (book_instance_id, member_id, due_at) VALUES (?, ?, datetime('now', ?))"
      )
      .run(bookInstanceId, memberId, `+${days} days`);

    return db.prepare('SELECT * FROM loans WHERE id = ?').get(info.lastInsertRowid);
  });

  try {
    res.status(201).json(borrow());
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    // 最后防线：并发时两个请求可能都通过了上面的检查，唯一索引只允许一个成功
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: '该副本已借出' });
    }
    throw err;
  }
});

// 还书：POST /loans/:id/return
app.post('/loans/:id/return', (req, res) => {
  const loanId = Number(req.params.id);

  if (!Number.isInteger(loanId) || loanId < 1) {
    return res.status(400).json({ error: '借阅记录 id 不合法' });
  }

  // 更新借阅记录和副本状态必须在同一个事务里
  const returnLoan = db.transaction(() => {
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    if (!loan) throw httpError(404, '借阅记录不存在');
    if (loan.returned_at) throw httpError(409, '该记录已归还');

    // 条件更新：只有未归还的记录才能被更新
    const updated = db
      .prepare("UPDATE loans SET returned_at = datetime('now') WHERE id = ? AND returned_at IS NULL")
      .run(loanId);
    if (updated.changes === 0) throw httpError(409, '该记录已归还');

    db.prepare("UPDATE book_instances SET status = 'available' WHERE id = ?").run(
      loan.book_instance_id
    );

    return db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
  });

  try {
    res.json(returnLoan());
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

// 借阅列表：GET /loans?status=active|overdue|returned&memberId=1&page=1&pageSize=10
app.get('/loans', (req, res) => {
  const { status } = req.query;

  if (status !== undefined && !['active', 'overdue', 'returned'].includes(status)) {
    return res.status(400).json({ error: 'status 只能是 active、overdue 或 returned' });
  }

  const memberId =
    req.query.memberId === undefined ? undefined : Number(req.query.memberId);
  if (memberId !== undefined && (!Number.isInteger(memberId) || memberId < 1)) {
    return res.status(400).json({ error: 'memberId 必须是正整数' });
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
  const offset = (page - 1) * pageSize;

  // 条件动态拼接，但值一律走占位符，绝不把用户输入直接拼进 SQL
  const conditions = [];
  const params = [];

  if (status === 'active') conditions.push('l.returned_at IS NULL');
  if (status === 'overdue') {
    conditions.push("l.returned_at IS NULL AND l.due_at < datetime('now')");
  }
  if (status === 'returned') conditions.push('l.returned_at IS NOT NULL');
  if (memberId !== undefined) {
    conditions.push('l.member_id = ?');
    params.push(memberId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM loans l ${where}`)
    .get(...params);

  const rows = db
    .prepare(
      `SELECT
         l.id,
         l.book_instance_id AS bookInstanceId,
         b.title AS bookTitle,
         l.member_id AS memberId,
         m.name AS memberName,
         l.borrowed_at AS borrowedAt,
         l.due_at AS dueAt,
         l.returned_at AS returnedAt,
         CASE
           WHEN l.returned_at IS NOT NULL THEN 'returned'
           WHEN l.due_at < datetime('now') THEN 'overdue'
           ELSE 'active'
         END AS status
       FROM loans l
       JOIN book_instances bi ON bi.id = l.book_instance_id
       JOIN books b ON b.id = bi.book_id
       JOIN members m ON m.id = l.member_id
       ${where}
       ORDER BY l.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  res.json({
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

app.listen(PORT, () => {
  console.log(`图书馆 API 已启动: http://localhost:${PORT}`);
  console.log(`试试: curl http://localhost:${PORT}/books`);
});
