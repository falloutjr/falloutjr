import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/database.mjs';
import { hashPassword, checkPassword } from '../server/security.mjs';
import { provisionAdmin } from '../server/bootstrap.mjs';

let fixtureHash;
before(async () => { fixtureHash = await hashPassword('A synthetic bootstrap fixture passphrase'); });
const config = overrides => ({
  ADMIN_BOOTSTRAP_EMAIL: 'OWNER@example.test',
  ADMIN_BOOTSTRAP_PASSWORD_HASH: fixtureHash,
  ADMIN_BOOTSTRAP_EXPIRES: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  ...overrides,
});
async function fixture(run) {
  const db = openDatabase(':memory:');
  try { await run(db); } finally { db.close(); }
}
async function addUser(db, email, role = 'user', development = 0) {
  const stamp = new Date().toISOString();
  await db.run('INSERT INTO users(id,name,email,password_hash,role,is_development,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', crypto.randomUUID(), 'Existing member', email, fixtureHash, role, development, stamp, stamp);
}

test('bootstrap has no effect without explicit hosting configuration', async () => fixture(async db => {
  assert.equal(await provisionAdmin(db, {}), false);
  assert.equal(await provisionAdmin(db, { ADMIN_BOOTSTRAP_EMAIL: '', ADMIN_BOOTSTRAP_PASSWORD_HASH: '', ADMIN_BOOTSTRAP_EXPIRES: '' }), false);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM users')).n, 0);
}));

test('bootstrap rejects partial, weak, malformed, and long-lived configuration', async () => fixture(async db => {
  for (const env of [
    { ADMIN_BOOTSTRAP_EMAIL: 'owner@example.test' },
    config({ ADMIN_BOOTSTRAP_EMAIL: 'invalid' }),
    config({ ADMIN_BOOTSTRAP_PASSWORD_HASH: fixtureHash.replace('$12$', '$10$') }),
    config({ ADMIN_BOOTSTRAP_PASSWORD_HASH: 'not-a-password-hash' }),
    config({ ADMIN_BOOTSTRAP_EXPIRES: 'tomorrow' }),
    config({ ADMIN_BOOTSTRAP_EXPIRES: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString() }),
  ]) await assert.rejects(provisionAdmin(db, env), /configuration is invalid/);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM users')).n, 0);
}));

test('expired bootstrap configuration fails closed without provisioning', async () => fixture(async db => {
  assert.equal(await provisionAdmin(db, config({ ADMIN_BOOTSTRAP_EXPIRES: new Date(Date.now() - 1000).toISOString() })), false);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM users')).n, 0);
}));

test('bootstrap creates a verified production administrator and records one-time provisioning', async () => fixture(async db => {
  assert.equal(await provisionAdmin(db, config()), true);
  const user = await db.get('SELECT * FROM users WHERE email=?', 'owner@example.test');
  assert.equal(user.role, 'admin'); assert.equal(user.status, 'active');
  assert.equal(user.verified, 1); assert.equal(user.is_development, 0);
  assert.equal(await checkPassword('A synthetic bootstrap fixture passphrase', user.password_hash), true);
  assert.ok(await db.get('SELECT key FROM system_settings WHERE key=?', 'admin_bootstrap_used'));
  const audit = await db.get('SELECT action,actor_id FROM audit');
  assert.equal(audit.action, 'admin.provisioned'); assert.equal(audit.actor_id, user.id);
  assert.equal(await provisionAdmin(db, config()), false);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM users')).n, 1);
}));

test('bootstrap never replaces an existing production administrator', async () => fixture(async db => {
  await addUser(db, 'existing@example.test', 'admin');
  assert.equal(await provisionAdmin(db, config()), false);
  assert.equal((await db.get('SELECT email FROM users')).email, 'existing@example.test');
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM users')).n, 1);
}));

test('bootstrap never promotes or overwrites an existing matching email', async () => fixture(async db => {
  await addUser(db, 'owner@example.test');
  assert.equal(await provisionAdmin(db, config()), false);
  const user = await db.get('SELECT * FROM users');
  assert.equal(user.role, 'user'); assert.equal(user.name, 'Existing member');
  assert.equal(user.password_hash, fixtureHash);
}));

test('used bootstrap marker prevents recreation after the provisioned account is removed', async () => fixture(async db => {
  assert.equal(await provisionAdmin(db, config()), true);
  await db.run('DELETE FROM users');
  assert.equal(await provisionAdmin(db, config()), false);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM users')).n, 0);
}));

test('a development administrator also blocks automatic production provisioning', async () => fixture(async db => {
  await addUser(db, 'development@example.test', 'admin', 1);
  assert.equal(await provisionAdmin(db, config()), false);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM users')).n, 1);
  assert.equal((await db.get("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND is_development=0")).n, 0);
}));

test('concurrent bootstrap invocations produce one account and one audit record', async () => fixture(async db => {
  const results = await Promise.all([provisionAdmin(db, config()), provisionAdmin(db, config())]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM users')).n, 1);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM audit')).n, 1);
}));
