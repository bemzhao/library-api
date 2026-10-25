# CLAUDE.md

只保留每个会话都必须知道的事实。细节按需阅读：

- 项目说明、技术栈、数据模型、接口、路线图 → `README.md`
- 分里程碑的详细计划 → `.claude/plan/`
- 已完成：`001-m1-foundation.md`；当前：`002-m2-loans.md`

## 关键事实

- Library API：本地图书馆后端，用于学习 Node.js + 关系型数据库
- Node.js 20 + Express 5 + SQLite（better-sqlite3），原生 SQL，暂不用 ORM
- 本地端口 3000；数据文件 `data/library.db`，不入库

## 命令

- `npm run dev` — 启动（`node --watch`）
- `npm run db:reset` — 删库重建 + 初始数据（会清空数据）
- `npm start` — 启动（不监听改动）

## 约定

- 每个可运行的小功能提交一次；改表结构同步 `sql/schema.sql` 与 README
- 接口只返回 JSON；前端以后独立仓库
- 开始工作前先读当前计划文件；计划变化时更新对应文件

## 协作方式

用户是前端出身、正在学后端：用大白话解释，不要求读官方文档；直接给可运行代码和唯一下一步；小步走、每步可验证；报错先带用户读堆栈。
