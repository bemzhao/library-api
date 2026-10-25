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

app.listen(PORT, () => {
  console.log(`图书馆 API 已启动: http://localhost:${PORT}`);
  console.log(`试试: curl http://localhost:${PORT}/books`);
});
