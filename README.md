# Library API

一个本地图书馆的后端服务，用来系统学习 Node.js 与关系型数据库。项目按小步迭代，每完成一个可运行的功能就提交一次。

## 技术栈

| 层 | 选择 | 说明 |
|---|---|---|
| 运行时 | Node.js 24（≥ 24.22.1） | |
| Web 框架 | Express 5 | |
| 数据库 | SQLite（better-sqlite3） | 本地零依赖、便于起步；后续迁移 PostgreSQL |
| 数据访问 | 原生 SQL | 先理解 SQL，再考虑引入 ORM |

## 快速开始

需要 Node.js ≥ 24.22.1（用 nvm 的话，项目根目录已提供 `.nvmrc`，执行 `nvm use` 即可）。

```bash
npm install
npm run db:reset   # 重建数据库并写入初始数据（会清空现有数据）
npm run dev        # http://localhost:3000
```

验证：

```bash
curl http://localhost:3000/health
curl http://localhost:3000/books
curl http://localhost:3000/loans
```

## 目录结构

```
.
├── src/          # 服务代码
│   ├── db.js     # 数据库连接
│   └── index.js  # Express 入口与路由
├── scripts/      # 工具脚本（建库等）
├── sql/          # 表结构与初始数据
├── data/         # SQLite 数据文件（已加入 .gitignore）
├── .claude/plan/ # 分里程碑的详细计划
└── README.md
```

## 数据模型

| 表 | 作用 |
|---|---|
| `authors` | 作者 |
| `genres` | 分类 |
| `books` | 图书，属于一个作者 |
| `book_genres` | 图书 ↔ 分类（多对多） |
| `book_instances` | 馆藏副本，一本书可有多个实体 |
| `members` | 会员 |
| `loans` | 借阅记录，`returned_at` 为空表示未归还 |

关键约束：部分唯一索引 `one_active_loan_per_instance` 保证同一副本同时最多只有一条未归还记录。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| GET | `/books?page=1&pageSize=10` | 图书列表（分页，含作者与分类） |
| POST | `/loans` | 借书（`memberId`、`bookInstanceId` 必填，`days` 可选，默认 30） |
| POST | `/loans/:id/return` | 还书 |
| GET | `/loans?status=&memberId=&page=1&pageSize=10` | 借阅列表（`status`：`active` / `overdue` / `returned`） |

## 路线图

> 每个里程碑的详细计划放在 `.claude/plan/`：001、002（已完成）。

- [x] **M1 地基**：Express + SQLite、7 张表、图书列表接口
- [x] **M2 借阅闭环**：借书 `POST /loans`、还书、逾期查询；事务与并发保护
- [ ] **M3 管理接口**：图书、作者、分类、会员的增删改查；参数校验；统一错误处理
- [ ] **M4 搜索与统计**：关键字搜索、热门排行、借阅历史；索引与查询优化
- [ ] **M5 登录鉴权**：会员登录、JWT、管理员与普通会员权限
- [ ] **M6 前端**：Vite + React + TypeScript 最小页面（独立仓库）
- [ ] **M7 工程化**：日志、测试、迁移到 PostgreSQL、Docker 部署

## 开发约定

- 每完成一个可运行的小功能，提交一次
- 修改表结构时，同步更新 `sql/schema.sql` 和本 README 的数据模型
- 有真实数据之前，用 `npm run db:reset` 重建数据库；有真实数据之后，再引入迁移文件
