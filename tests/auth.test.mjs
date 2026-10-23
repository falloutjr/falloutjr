import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../server/index.mjs';
import { openDatabase } from '../server/database.mjs';
import { hashPassword, digest } from '../server/security.mjs';
import { createApp } from '../server/app.mjs';
import { seedAdmin } from '../scripts/seed-admin.mjs';

let fixture, db, server, origin;
const configuredOrigin = 'http://localhost:3000';
const mail = [];
const password = 'A-local-test-passphrase-829';
let adminCookie, moderatorCookie, userCookie, secondCookie, userId;

async function request(path, { method = 'GET', data, cookie, originHeader = configuredOrigin } = {}) {
  const headers = {};
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers.Origin = originHeader;
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(origin + path, { method, headers, body: data === undefined ? undefined : JSON.stringify(data), redirect: 'manual' });
  let result;
  if (response.headers.get('content-type')?.includes('application/json')) result = await response.json();
  return { response, result, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const login = email => request('/api/auth/login', { method: 'POST', data: { email, password } });

before(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'falloutjr-auth-'));
  db = openDatabase(join(fixture, 'test.sqlite'));
  const hash = await hashPassword(password), createdAt = new Date().toISOString();
  for (const [id, role] of [['admin-id', 'admin'], ['moderator-id', 'moderator']]) {
    await db.run('INSERT INTO users(id,name,email,password_hash,role,verified,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)', id, role, `${role}@example.test`, hash, role, createdAt, createdAt);
  }
  ({ server } = createServer({ db, env: { APP_ORIGIN: configuredOrigin }, deliverMail: async value => { mail.push(value); return true; } }));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  adminCookie = (await login('admin@example.test')).cookie;
  moderatorCookie = (await login('moderator@example.test')).cookie;
});
after(async () => {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  db?.close(); if (fixture) await rm(fixture, { recursive: true, force: true });
});

test('guests can read public pages while protected HTML and API enforce sign-in', async () => {
  assert.equal((await request('/')).response.status, 200);
  const page = await request('/admin');
  assert.equal(page.response.status, 302);
  assert.match(page.response.headers.get('location'), /\/login\?next=%2Fadmin$/);
  for (const path of ['/api/profile', '/api/admin/overview', '/api/admin/users', '/api/admin/settings']) assert.equal((await request(path)).response.status, 401);
  assert.equal((await request('/api/auth/me')).result.data.user, null);
  assert.equal((await request('/.env')).response.status, 404);
  assert.equal((await request('/server/database.mjs')).response.status, 404);
  const foreignTarget = await request('//evil.example/admin');
  assert.equal(foreignTarget.response.status, 400); assert.equal(foreignTarget.response.headers.get('location'), null);
  for (const path of ['/assets/%2e%2e%2fREADME.md', '/assets/%2e%2e%2f.env', '/css/%2e%2e%2fserver/app.mjs', '/assets/%252e%252e%252f.env']) {
    assert.equal((await request(path)).response.status, 404, `Traversal must be rejected: ${path}`);
  }
});

test('registration validates fields, ignores injected roles, hashes passwords, and creates an opaque cookie', async () => {
  const invalid = await request('/api/auth/register', { method: 'POST', data: { name: '', email: 'bad', password: 'tiny' } });
  assert.equal(invalid.response.status, 422); assert.ok(invalid.result.fields.email); assert.ok(invalid.result.fields.password);
  const created = await request('/api/auth/register', { method: 'POST', data: { name: 'Alex Builder', email: 'alex@example.test', password, role: 'admin', verified: true } });
  assert.equal(created.response.status, 201); assert.equal(created.result.data.user.role, 'user'); assert.equal(created.result.data.user.verified, false);
  assert.equal(created.result.data.emailDelivery, true);
  assert.match(created.response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  assert.match(created.cookie, /^fj_session=[a-f0-9]{64}$/);
  userCookie = created.cookie; userId = created.result.data.user.id;
  const stored = await db.get('SELECT * FROM users WHERE id=?', userId);
  assert.notEqual(stored.password_hash, password); assert.match(stored.password_hash, /^\$2[aby]\$12\$/);
  const rawSession = userCookie.split('=')[1];
  assert.ok(await db.get('SELECT id_hash FROM sessions WHERE id_hash=?', await digest(rawSession)));
  assert.equal(await db.get('SELECT id_hash FROM sessions WHERE id_hash=?', rawSession), undefined);
  assert.ok(!JSON.stringify(created.result).includes('password_hash'));
});

test('invalid credentials fail and regular users cannot access management pages or APIs', async () => {
  const bad = await request('/api/auth/login', { method: 'POST', data: { email: 'alex@example.test', password: 'wrong-password' } });
  assert.equal(bad.response.status, 401);
  const noAccount = await request('/api/auth/login', { method: 'POST', data: { email: 'unknown@example.test', password } });
  assert.equal(noAccount.response.status, 401); assert.equal(bad.result.error, noAccount.result.error);
  const page = await request('/admin', { cookie: userCookie });
  assert.equal(page.response.status, 302); assert.match(page.response.headers.get('location'), /\/unauthorized$/);
  for (const path of ['/api/admin/overview', '/api/admin/users', '/api/admin/permissions', '/api/admin/content', '/api/admin/logs']) assert.equal((await request(path, { cookie: userCookie })).response.status, 403);
});

test('server rejects cross-origin mutations and keeps profile role/email immutable', async () => {
  const forbidden = await request('/api/profile', { method: 'PATCH', cookie: userCookie, originHeader: 'https://evil.example', data: { name: 'Changed' } });
  assert.equal(forbidden.response.status, 403);
  assert.equal((await request('/api/profile', { method: 'PATCH', cookie: userCookie, data: { name: '' } })).response.status, 422);
  const update = await request('/api/profile', { method: 'PATCH', cookie: userCookie, data: { name: '<script>literal text</script>', role: 'admin', email: 'hacker@example.test' } });
  assert.equal(update.response.status, 200); assert.equal(update.result.data.user.role, 'user'); assert.equal(update.result.data.user.email, 'alex@example.test');
  assert.equal(update.response.headers.get('x-content-type-options'), 'nosniff');
});

test('moderators manage content, see limited logs, and cannot administer users or settings', async () => {
  for (const path of ['/api/admin/overview', '/api/admin/users', '/api/admin/analytics', '/api/admin/permissions', '/api/admin/settings']) assert.equal((await request(path, { cookie: moderatorCookie })).response.status, 403);
  const created = await request('/api/admin/content', { method: 'POST', cookie: moderatorCookie, data: { title: 'Development journal', body: 'A detailed progress update on the project.', status: 'draft' } });
  assert.equal(created.response.status, 201); const cid = created.result.data.content.id;
  assert.equal((await request(`/api/admin/content/${cid}`, { method: 'PATCH', cookie: moderatorCookie, data: { status: 'published' } })).result.data.content.status, 'published');
  const logs = (await request('/api/admin/logs', { cookie: moderatorCookie })).result.data.logs;
  assert.ok(logs.length); assert.ok(logs.every(log => log.action.startsWith('content.')));
  assert.equal((await request(`/api/admin/content/${cid}`, { method: 'DELETE', cookie: moderatorCookie })).response.status, 200);
});

test('admin lists and filters real users, reads analytics and cannot remove own access', async () => {
  const list = await request('/api/admin/users?search=alex&role=user&page=1', { cookie: adminCookie });
  assert.equal(list.response.status, 200); assert.equal(list.result.data.users.length, 1); assert.equal(list.result.data.pagination.total, 1);
  assert.equal((await request('/api/admin/users?search=%27%20OR%201=1--', { cookie: adminCookie })).result.data.users.length, 0);
  const overview = (await request('/api/admin/overview', { cookie: adminCookie })).result.data;
  assert.ok(overview.stats.users >= 3); assert.equal(overview.chart.length, 14); assert.ok(overview.recentActivity.length);
  assert.equal((await request('/api/admin/permissions', { cookie: adminCookie })).result.data.roles.length, 3);
  assert.equal((await request('/api/admin/users/admin-id', { method: 'PATCH', cookie: adminCookie, data: { role: 'user' } })).response.status, 409);
  assert.equal((await request('/api/admin/users/admin-id', { method: 'PATCH', cookie: adminCookie, data: { status: 'suspended' } })).response.status, 409);
});

test('notifications belong to their owner and settings validate actual changes', async () => {
  const second = await request('/api/auth/register', { method: 'POST', data: { name: 'Sam Test', email: 'sam@example.test', password } });
  secondCookie = second.cookie;
  const mine = (await request('/api/notifications', { cookie: userCookie })).result.data.notifications;
  assert.equal(mine.length, 1);
  await request('/api/notifications', { method: 'PATCH', cookie: secondCookie, data: { id: mine[0].id, read: true } });
  assert.equal((await request('/api/notifications', { cookie: userCookie })).result.data.notifications[0].read, false);
  await request('/api/notifications', { method: 'PATCH', cookie: userCookie, data: { all: true } });
  assert.equal((await request('/api/notifications', { cookie: userCookie })).result.data.notifications[0].read, true);
  assert.equal((await request('/api/settings', { method: 'PATCH', cookie: userCookie, data: { emailNotifications: 'yes' } })).response.status, 422);
  assert.equal((await request('/api/settings', { method: 'PATCH', cookie: userCookie, data: { emailNotifications: false } })).result.data.emailNotifications, false);
});

test('contact form rejects invalid input and stores valid submissions server-side', async () => {
  const bad = await request('/api/contact', { method: 'POST', data: { name: 'A', email: 'bad', subject: '', message: '' } });
  assert.equal(bad.response.status, 422); assert.equal(Object.keys(bad.result.fields).length, 4);
  const good = await request('/api/contact', { method: 'POST', data: { name: 'Casey Client', email: 'casey@example.test', subject: 'Project inquiry', message: 'Let us discuss a responsive development project.' } });
  assert.equal(good.response.status, 201);
  assert.equal((await request('/api/admin/contacts', { cookie: adminCookie })).result.data.contacts.length, 1);
  assert.equal((await request('/api/admin/contacts', { cookie: moderatorCookie })).response.status, 403);
});

test('verification tokens are single use and never returned in API responses', async () => {
  const verifyMail = mail.find(value => value.to === 'alex@example.test' && value.subject.includes('Verify'));
  const token = verifyMail.text.match(/token=([a-f0-9]{64})/)[1];
  assert.equal((await request('/api/auth/verify-email', { method: 'POST', data: { token } })).result.data.verified, true);
  assert.equal((await request('/api/auth/me', { cookie: userCookie })).result.data.user.verified, true);
  assert.equal((await request('/api/auth/verify-email', { method: 'POST', data: { token } })).response.status, 400);
});

test('password recovery uses generic responses, consumes tokens, and revokes existing sessions', async () => {
  const missing = await request('/api/auth/forgot-password', { method: 'POST', data: { email: 'absent@example.test' } });
  const existing = await request('/api/auth/forgot-password', { method: 'POST', data: { email: 'sam@example.test' } });
  assert.deepEqual(missing.result, existing.result);
  const resetMail = mail.find(value => value.to === 'sam@example.test' && value.subject.includes('Reset'));
  const token = resetMail.text.match(/token=([a-f0-9]{64})/)[1];
  assert.equal((await request('/api/auth/reset-password', { method: 'POST', data: { token, password: 'tiny' } })).response.status, 422);
  const reset = await request('/api/auth/reset-password', { method: 'POST', data: { token, password: 'A-new-long-passphrase-983' } });
  assert.equal(reset.response.status, 200);
  assert.equal((await request('/api/auth/me', { cookie: secondCookie })).result.data.user, null);
  assert.equal((await request('/api/auth/reset-password', { method: 'POST', data: { token, password: 'Another-long-passphrase-983' } })).response.status, 400);
  assert.equal((await login('sam@example.test')).response.status, 401);
  assert.equal((await request('/api/auth/login', { method: 'POST', data: { email: 'sam@example.test', password: 'A-new-long-passphrase-983' } })).response.status, 200);
});

test('changing a password checks the current secret, rotates the current session, and revokes other devices', async () => {
  const otherSession = await login('alex@example.test');
  await request('/api/auth/forgot-password', { method: 'POST', data: { email: 'alex@example.test' } });
  const staleReset = mail.filter(value => value.to === 'alex@example.test' && value.subject.includes('Reset')).at(-1).text.match(/token=([a-f0-9]{64})/)[1];
  const invalid = await request('/api/settings', { method: 'PATCH', cookie: userCookie, data: { currentPassword: 'incorrect', newPassword: 'Replacement-long-password-741' } });
  assert.equal(invalid.response.status, 422);
  const updated = await request('/api/settings', { method: 'PATCH', cookie: userCookie, data: { currentPassword: password, newPassword: 'Replacement-long-password-741' } });
  assert.equal(updated.response.status, 200); assert.ok(updated.cookie); assert.notEqual(updated.cookie, userCookie);
  assert.equal((await request('/api/auth/reset-password', { method: 'POST', data: { token: staleReset, password: 'Attacker-stale-password-837' } })).response.status, 400);
  assert.equal((await request('/api/profile', { cookie: otherSession.cookie })).response.status, 401);
  assert.equal((await request('/api/profile', { cookie: userCookie })).response.status, 401);
  userCookie = updated.cookie;
  // Restore the shared test password using the same secure account flow.
  const restored = await request('/api/settings', { method: 'PATCH', cookie: userCookie, data: { currentPassword: 'Replacement-long-password-741', newPassword: password } });
  assert.equal(restored.response.status, 200); userCookie = restored.cookie;
});

test('role changes and suspension invalidate sessions immediately', async () => {
  const promote = await request(`/api/admin/users/${userId}`, { method: 'PATCH', cookie: adminCookie, data: { role: 'moderator' } });
  assert.equal(promote.response.status, 200);
  assert.equal((await request('/api/auth/me', { cookie: userCookie })).result.data.user, null);
  userCookie = (await login('alex@example.test')).cookie;
  assert.equal((await request('/api/admin/content', { cookie: userCookie })).response.status, 200);
  const suspended = await request(`/api/admin/users/${userId}`, { method: 'PATCH', cookie: adminCookie, data: { status: 'suspended' } });
  assert.equal(suspended.response.status, 200);
  assert.equal((await request('/api/profile', { cookie: userCookie })).response.status, 401);
  assert.equal((await login('alex@example.test')).response.status, 401);
});

test('logout revokes the actual server session and expired sessions fail closed', async () => {
  const signedIn = await login('moderator@example.test');
  assert.equal((await request('/api/profile', { cookie: signedIn.cookie })).response.status, 200);
  const loggedOut = await request('/api/auth/logout', { method: 'POST', cookie: signedIn.cookie, data: {} });
  assert.equal(loggedOut.response.status, 200); assert.match(loggedOut.response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await request('/api/profile', { cookie: signedIn.cookie })).response.status, 401);
  const expired = await login('moderator@example.test');
  await db.run('UPDATE sessions SET expires_at=0 WHERE id_hash=?', await digest(expired.cookie.split('=')[1]));
  assert.equal((await request('/api/profile', { cookie: expired.cookie })).response.status, 401);
});

test('admin settings enforce closed registration and login rate limiting returns 429', async () => {
  assert.equal((await request('/api/admin/settings', { method: 'PATCH', cookie: adminCookie, data: { registrationOpen: false, siteName: 'FalloutJr' } })).response.status, 200);
  assert.equal((await request('/api/auth/register', { method: 'POST', data: { name: 'Blocked Person', email: 'blocked@example.test', password } })).response.status, 403);
  let last;
  for (let i = 0; i < 9; i++) last = await request('/api/auth/login', { method: 'POST', data: { email: 'ratelimit@example.test', password: 'incorrect' } });
  assert.equal(last.response.status, 429);
});

test('an in-flight login cannot create a session after its authenticated password changes', async () => {
  const oldHash = await hashPassword(password), replacement = await hashPassword('Concurrent-replacement-secret-518');
  const stamp = new Date().toISOString();
  await db.run('INSERT INTO users(id,name,email,password_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)', 'race-id', 'Race Account', 'race@example.test', oldHash, stamp, stamp);
  let triggered = false;
  const racingDb = { ...db, get: async (sql, ...args) => {
    const row = await db.get(sql, ...args);
    if (!triggered && sql === 'SELECT * FROM users WHERE email=?' && args[0] === 'race@example.test') {
      triggered = true;
      await db.run('UPDATE users SET password_hash=?,credential_version=credential_version+1 WHERE id=?', replacement, 'race-id');
    }
    return row;
  } };
  const handler = createApp({ db: racingDb, env: { APP_ORIGIN: configuredOrigin } });
  const response = await handler(new Request(configuredOrigin + '/api/auth/login', { method: 'POST', headers: { Origin: configuredOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'race@example.test', password }) }));
  assert.equal(triggered, true); assert.equal(response.status, 401); assert.equal(response.headers.get('set-cookie'), null);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?', 'race-id')).n, 0);
});

test('a reset already in flight cannot overwrite a newer password change', async () => {
  const rawToken = 'a'.repeat(64), hash = await digest(rawToken);
  const row = await db.get('SELECT credential_version FROM users WHERE id=?', 'race-id');
  await db.run('INSERT INTO tokens(id_hash,user_id,purpose,expires_at,credential_version) VALUES(?,?,?,?,?)', hash, 'race-id', 'reset', Date.now() + 60000, row.credential_version);
  const preserved = await hashPassword('Owner-newest-secret-passphrase-582');
  let triggered = false;
  const racingDb = { ...db, get: async (sql, ...args) => {
    const result = await db.get(sql, ...args);
    if (!triggered && sql.startsWith('DELETE FROM tokens') && args[0] === hash) {
      triggered = true;
      await db.run('UPDATE users SET password_hash=?,credential_version=credential_version+1 WHERE id=?', preserved, 'race-id');
    }
    return result;
  } };
  const handler = createApp({ db: racingDb, env: { APP_ORIGIN: configuredOrigin } });
  const response = await handler(new Request(configuredOrigin + '/api/auth/reset-password', { method: 'POST', headers: { Origin: configuredOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token: rawToken, password: 'Stale-reset-overwrite-secret-471' }) }));
  assert.equal(triggered, true); assert.equal(response.status, 400);
  assert.equal((await db.get('SELECT password_hash FROM users WHERE id=?', 'race-id')).password_hash, preserved);
});

test('development seed requires explicit opt-in, rejects placeholder secrets and production use', async () => {
  await assert.rejects(seedAdmin({ db, env: { NODE_ENV: 'production', ENABLE_DEV_ADMIN: 'true' } }), /disabled in production/);
  await assert.rejects(seedAdmin({ db, env: {} }), /explicitly enable/);
  await assert.rejects(seedAdmin({ db, env: { ENABLE_DEV_ADMIN: 'true', ADMIN_EMAIL: 'dev@example.test', ADMIN_PASSWORD: 'change-this-password' } }), /unique ADMIN_PASSWORD/);
  await seedAdmin({ db, env: { ENABLE_DEV_ADMIN: 'true', ADMIN_EMAIL: 'dev@example.test', ADMIN_PASSWORD: password } });
  const account = await db.get('SELECT * FROM users WHERE email=?', 'dev@example.test');
  assert.equal(account.role, 'admin'); assert.equal(account.verified, 1); assert.equal(account.is_development, 1); assert.notEqual(account.password_hash, password);
  const production = createApp({ db, env: { NODE_ENV: 'production', APP_ORIGIN: configuredOrigin } });
  const denied = await production(new Request(configuredOrigin + '/api/auth/login', { method: 'POST', headers: { Origin: configuredOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'dev@example.test', password }) }));
  assert.equal(denied.status, 401);
  const developmentLogin = await login('dev@example.test');
  assert.equal(developmentLogin.response.status, 200);
  const productionSession = await production(new Request(configuredOrigin + '/api/auth/me', { headers: { Cookie: developmentLogin.cookie } }));
  assert.equal((await productionSession.json()).data.user, null);
  await seedAdmin({ db, env: { ENABLE_DEV_ADMIN: 'true', ADMIN_EMAIL: 'dev@example.test' }, disable: true });
  assert.equal((await db.get('SELECT status FROM users WHERE id=?', account.id)).status, 'suspended');
  assert.throws(() => createServer({ db, env: { NODE_ENV: 'production', ENABLE_DEV_ADMIN: 'true' } }), /Disable ENABLE_DEV_ADMIN/);
});
