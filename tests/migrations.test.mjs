import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);

test('hosted Drizzle baseline matches all local application tables, columns, defaults and foreign keys', () => {
  const local = new DatabaseSync(':memory:'), hosted = new DatabaseSync(':memory:');
  try {
    local.exec('PRAGMA foreign_keys=ON'); hosted.exec('PRAGMA foreign_keys=ON');
    for (const name of readdirSync(new URL('migrations/', root)).filter(name => name.endsWith('.sql')).sort()) local.exec(readFileSync(new URL('migrations/' + name, root), 'utf8'));
    const journal = JSON.parse(readFileSync(new URL('drizzle/meta/_journal.json', root), 'utf8'));
    assert.equal(journal.dialect, 'sqlite'); assert.ok(journal.entries.length);
    for (const entry of journal.entries) hosted.exec(readFileSync(new URL(`drizzle/${entry.tag}.sql`, root), 'utf8'));
    const tables = db => db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row => row.name);
    assert.deepEqual(tables(hosted), tables(local)); assert.equal(tables(hosted).length, 9);
    for (const table of tables(local)) {
      // Drizzle explicitly marks primary keys NOT NULL; legacy SQLite's implicit
      // primary keys have identical app semantics but report notnull=0 in PRAGMA.
      const columns = db => db.prepare('SELECT name,type,dflt_value,pk,CASE WHEN pk>0 THEN 1 ELSE "notnull" END AS required FROM pragma_table_info(?) ORDER BY name').all(table);
      assert.deepEqual(columns(hosted), columns(local), `Column contract: ${table}`);
      const foreignKeys = db => db.prepare('SELECT "table","from","to",on_update,on_delete FROM pragma_foreign_key_list(?) ORDER BY "from"').all(table);
      assert.deepEqual(foreignKeys(hosted), foreignKeys(local), `Foreign keys: ${table}`);
    }
    for (const db of [local, hosted]) {
      assert.throws(() => db.prepare("INSERT INTO users(id,name,email,password_hash,role,created_at,updated_at) VALUES('bad','Bad','bad@example.test','hash','owner','now','now')").run(), /CHECK/);
      assert.throws(() => db.prepare("INSERT INTO sessions(id_hash,user_id,expires_at,created_at) VALUES('hash','missing',1,'now')").run(), /FOREIGN KEY/);
    }
  } finally { local.close(); hosted.close(); }
});
