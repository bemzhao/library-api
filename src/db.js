import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 打开数据文件；文件不存在时会自动创建
const db = new Database(path.join(root, 'data', 'library.db'));
db.pragma('journal_mode = WAL'); // 读写不互相阻塞
db.pragma('foreign_keys = ON'); // 让外键约束生效

export default db;
