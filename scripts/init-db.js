import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = path.join(root, 'data', 'library.db');

// 删掉旧数据库，从零开始
for (const suffix of ['', '-wal', '-shm']) {
  fs.rmSync(dbFile + suffix, { force: true });
}

const db = new Database(dbFile);
db.pragma('foreign_keys = ON');

db.exec(fs.readFileSync(path.join(root, 'sql', 'schema.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'sql', 'seed.sql'), 'utf8'));

const tables = ['authors', 'genres', 'books', 'book_genres', 'book_instances', 'members', 'loans'];
console.log('数据库已重建：');
for (const table of tables) {
  const { n } = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get();
  console.log(`  ${table.padEnd(14)} ${n} 行`);
}

db.close();
