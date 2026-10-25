# 001 — M1 地基

状态：已完成（2026-10-25）
对应路线图：M1 地基

## 目标

搭起一个能跑的最小后端：Express 提供 HTTP 接口，SQLite 存数据，验证「请求 → SQL → JSON」全链路。

## 完成内容

- 7 张表：`authors`、`genres`、`books`、`book_genres`、`book_instances`、`members`、`loans`
- `npm run db:reset`：删库重建并写入初始数据
- `GET /health`：健康检查
- `GET /books?page=1&pageSize=10`：分页图书列表，联表作者、聚合分类
- README + 首次提交 `c84d7e4`

## 关键决策

- **SQLite 而不是 PostgreSQL**：本机没有 Homebrew、Docker、PostgreSQL，SQLite 零安装成本；SQL 写法与 Postgres 高度接近，后续迁移是受控改动。
- **原生 SQL，不上 ORM**：先看清 SQL 和表关系，再考虑 Prisma 之类的工具。
- **数据库文件不入库**：`data/*.db` 由 `db:reset` 重建，仓库只保存 schema 和 seed。
- **一本书一个作者**：简化模型；未来需要合著时再加 `book_authors` 中间表。

## 验收

- [x] 服务启动，`/health` 返回 `{ "ok": true }`
- [x] `/books` 返回 3 本书，含作者与分类
- [x] 分页参数生效

## 已知限制（后续里程碑处理）

- 没有参数校验和统一错误处理（M3）
- 没有写接口（M2）
- 没有鉴权（M5）
