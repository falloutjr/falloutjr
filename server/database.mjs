import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(filename = process.env.DATABASE_PATH || '.data/falloutjr.sqlite') {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  sqlite.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
  const migrations = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(migrations).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
    if (sqlite.prepare('SELECT name FROM _local_migrations WHERE name=?').get(name)) continue;
    sqlite.exec('BEGIN');
    try {
      sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
      sqlite.prepare('INSERT INTO _local_migrations(name) VALUES(?)').run(name);
      sqlite.exec('COMMIT');
    } catch (error) { sqlite.exec('ROLLBACK'); sqlite.close(); throw error; }
  }
  return {
    all: async (sql, ...args) => sqlite.prepare(sql).all(...args),
    get: async (sql, ...args) => sqlite.prepare(sql).get(...args),
    run: async (sql, ...args) => sqlite.prepare(sql).run(...args),
    close: () => sqlite.close(),
  };
}
