# 002 — M2 借阅闭环

状态：进行中（下一步）
对应路线图：M2 借阅闭环

## 目标

让服务第一次具备「写」的能力：借书、还书、查借阅记录。重点是**事务**和**并发约束**。

## 要做的接口

### 1. `POST /loans` — 借书

入参：

```json
{ "memberId": 2, "bookInstanceId": 3, "days": 30 }
```

`days` 可选，默认 30。

- 成功：`201` + 借阅记录
- 失败：会员或副本不存在 `404`；副本已借出 `409`；参数缺失 `400`

### 2. `POST /loans/:id/return` — 还书

- 成功：`200` + 更新后的记录
- 失败：记录不存在 `404`；已经归还 `409`

### 3. `GET /loans` — 借阅列表

查询参数：`status=active|overdue|returned`、`memberId`、`page`、`pageSize`。

联表返回书名、副本编号、会员名、借出/应还/归还时间。

- `active`：`returned_at IS NULL`
- `overdue`：`returned_at IS NULL AND due_at < 当前时间`
- `returned`：`returned_at IS NOT NULL`

## 数据库层面

已有的部分唯一索引是最后防线：

```sql
CREATE UNIQUE INDEX one_active_loan_per_instance
  ON loans(book_instance_id)
  WHERE returned_at IS NULL;
```

借书必须在**一个事务**里完成：

1. 查副本是否存在
2. 查该副本有没有未归还的借阅
3. 把副本状态从 `available` 改成 `borrowed`（条件里带 `status = 'available'`）
4. 插入 `loans` 记录

任何一步失败，整个事务回滚。不能出现「状态改了但没记录」或反过来的中间态。

还书同理：更新 `returned_at` + 把副本状态改回 `available`，必须在同一事务。

注意：当前是单进程，`better-sqlite3` 又是同步 API，请求天然串行；唯一索引仍然必要，它防的是未来多进程、多实例以及代码路径遗漏。

## 验收

- [ ] 正常借书返回 `201`
- [ ] 同一副本第二次借出返回 `409`
- [ ] 重复/并发请求不会产生两条未归还记录
- [ ] 还书后副本恢复 `available`，可以再次借出
- [ ] `GET /loans?status=overdue` 能查出过期未还记录
- [ ] 所有失败路径有明确的 HTTP 状态码，不是 `500`

## 验证方式

用 curl 依次执行（实现时给出完整命令）：

1. 借一本可借副本 → `201`
2. 再借同一副本 → `409`
3. 查询该会员的借阅 → 1 条 `active`
4. 还书 → `200`
5. 再次借同一副本 → `201`
6. 查 `overdue` → 空（新借的记录还没到期）

## 不在本期范围

预约排队、逾期罚金、鉴权（M5）、统一校验与错误处理框架（M3）。
