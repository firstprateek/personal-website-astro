// A stand-in for a D1 binding over node:sqlite, enough for this Worker:
// prepare().bind().first()/all()/run(). Each call runs the real SQL on an
// in-memory database built from the migrations.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../migrations/', import.meta.url);

export function d1() {
  const db = new DatabaseSync(':memory:');
  for (const file of readdirSync(dir).sort()) db.exec(readFileSync(new URL(file, dir), 'utf8'));
  const statement = (sql, args = []) => ({
    bind: (...next) => statement(sql, next),
    async first(column) {
      const row = db.prepare(sql).get(...args);
      if (row === undefined) return null;
      return column ? row[column] : { ...row };
    },
    async all() {
      return { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) };
    },
    async run() {
      const info = db.prepare(sql).run(...args);
      return { meta: { changes: Number(info.changes) } };
    },
  });
  return { prepare: (sql) => statement(sql), sqlite: db };
}
