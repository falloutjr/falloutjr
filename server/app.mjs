import { hashPassword, checkPassword, randomToken, digest, userView, emailValid, cleanText, passwordValid, ROLES, routeRoles } from './security.mjs';

const SESSION_MS = 12 * 60 * 60 * 1000;
// A timing-only hash with no corresponding account. Never create this account.
const DUMMY_PASSWORD_HASH = '$2b$12$SRsUJZ11TIbCcYUe4mFmcOTGlCg770I80wM2p3R03x2nGEPafnyMS';
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
const fail = (status, message, fields) => { throw new HttpError(status, message, fields); };
const requireMethod = (request, ...methods) => { if (!methods.includes(request.method)) fail(405, 'This method is not supported.'); };
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify({ data }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};
export function secured(response, request) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
  if (routeRoles(new URL(request.url).pathname)) headers.set('Cache-Control', 'private, no-store');
  if (new URL(request.url).protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function createApp({ db, env = {}, deliverMail, assets }) {
  const cookie = (token, request, clear = false) => `fj_session=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_MS / 1000}${new URL(request.url).protocol === 'https:' || env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  async function session(request) {
    const raw = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)fj_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (!raw) return null;
    const hash = await digest(raw);
    const user = await db.get('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.id_hash=? AND s.expires_at>? AND u.status=?', hash, Date.now(), 'active');
    if (user?.is_development && env.NODE_ENV === 'production') return null;
    return user ? { user, hash } : null;
  }
  async function audit(actor, action, target = '') {
    await db.run('INSERT INTO audit(id,actor_id,actor_name,action,target,created_at) VALUES(?,?,?,?,?,?)', id(), actor?.id || null, actor?.name || 'Guest', action, cleanText(target, 200), now());
  }
  async function throttle(key, max = 8, minutes = 15) {
    const stamp = Date.now();
    await db.run('INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END', key, stamp + minutes * 60000, stamp, stamp, stamp + minutes * 60000);
    const limit = await db.get('SELECT count FROM rate_limits WHERE key=?', key);
    if (limit.count > max) fail(429, 'Too many attempts. Please try again later.');
    await db.run('DELETE FROM rate_limits WHERE reset_at<?', stamp - 86400000);
  }
  const ipKey = request => request.headers.get('CF-Connecting-IP') || request.headers.get('X-Client-IP') || 'local';
  async function body(request) {
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) fail(415, 'Send a JSON request.');
    if (Number(request.headers.get('Content-Length')) > 20000) fail(413, 'This submission is too large.');
    const reader = request.body?.getReader();
    const chunks = []; let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 20000) { await reader.cancel(); fail(413, 'This submission is too large.'); }
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const raw = new TextDecoder().decode(bytes);
    try { const value = JSON.parse(raw); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value; }
    catch { fail(400, 'Enter a valid submission.'); }
  }
  async function newSession(user, request) {
    const token = randomToken();
    await db.run('DELETE FROM sessions WHERE expires_at<=?', Date.now());
    // Atomically bind issuance to the hash we authenticated, preventing an old-password
    // login in flight from creating a fresh session after a concurrent password reset.
    const inserted = await db.run('INSERT INTO sessions(id_hash,user_id,expires_at,created_at) SELECT ?,id,?,? FROM users WHERE id=? AND password_hash=? AND status=? AND (?=0 OR is_development=0)', await digest(token), Date.now() + SESSION_MS, now(), user.id, user.password_hash, 'active', env.NODE_ENV === 'production' ? 1 : 0);
    if (!inserted.changes) fail(401, 'Your account changed. Sign in again to continue.');
    return cookie(token, request);
  }
  async function issueToken(user, purpose, request) {
    const token = randomToken();
    await db.run('DELETE FROM tokens WHERE user_id=? AND purpose=?', user.id, purpose);
    const current = await db.get('SELECT credential_version FROM users WHERE id=?', user.id);
    await db.run('INSERT INTO tokens(id_hash,user_id,purpose,expires_at,credential_version) VALUES(?,?,?,?,?)', await digest(token), user.id, purpose, Date.now() + (purpose === 'verify' ? 86400000 : 1800000), current.credential_version);
    const origin = env.APP_ORIGIN || new URL(request.url).origin;
    const link = `${origin}/${purpose === 'verify' ? 'verify-email' : 'reset-password'}?token=${token}`;
    const mail = { to: user.email, from: env.MAIL_FROM || 'FalloutJr', subject: purpose === 'verify' ? 'Verify your FalloutJr email' : 'Reset your FalloutJr password', text: `${purpose === 'verify' ? 'Verify your email' : 'Reset your password'} using this single-use link: ${link}` };
    if (deliverMail) { try { return await deliverMail(mail); } catch { return false; } }
    if (env.MAIL_API_URL && env.MAIL_API_TOKEN && env.MAIL_FROM) {
      try {
        const result = await fetch(env.MAIL_API_URL, { method: 'POST', headers: { 'Authorization': `Bearer ${env.MAIL_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(mail), signal: AbortSignal.timeout(10000) });
        return result.ok;
      } catch { return false; }
    }
    return false;
  }
  async function systemSettings() {
    const row = await db.get('SELECT value FROM system_settings WHERE key=?', 'site');
    return { maintenance: false, registrationOpen: true, siteName: 'FalloutJr', ...(row ? JSON.parse(row.value) : {}) };
  }
  async function stats() {
    const [users, sessions, content, contacts] = await Promise.all([
      db.get('SELECT COUNT(*) AS n FROM users'), db.get('SELECT COUNT(*) AS n FROM sessions WHERE expires_at>?', Date.now()), db.get('SELECT COUNT(*) AS n FROM content'), db.get('SELECT COUNT(*) AS n FROM contacts'),
    ]);
    return { users: users.n, activeSessions: sessions.n, content: content.n, contacts: contacts.n };
  }
  async function chart() {
    const [userDays, loginDays] = await Promise.all([db.all('SELECT substr(created_at,1,10) AS date,COUNT(*) AS n FROM users GROUP BY date'), db.all("SELECT substr(created_at,1,10) AS date,COUNT(*) AS n FROM audit WHERE action='auth.login' GROUP BY date")]);
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
      return { date, users: userDays.find(d => d.date === date)?.n || 0, logins: loginDays.find(d => d.date === date)?.n || 0 };
    });
  }
  const activityView = row => ({ id: row.id, action: row.action, actor: row.actor_name, target: row.target, createdAt: row.created_at });
  const contentView = row => ({ id: row.id, title: row.title, body: row.body, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at });

  async function api(request, url) {
    const path = url.pathname;
    if (!['GET', 'HEAD'].includes(request.method)) {
      const expected = env.APP_ORIGIN ? new URL(env.APP_ORIGIN).origin : url.origin;
      if (request.headers.get('Origin') !== expected) fail(403, 'This request could not be verified. Reload the page and try again.');
    }
    const auth = await session(request);
    const user = auth?.user;
    if (path === '/api/auth/me') { requireMethod(request, 'GET'); return json({ user: userView(user) }); }
    if (path === '/api/public/status') { requireMethod(request, 'GET'); const s = await systemSettings(); return json({ siteName: s.siteName, maintenance: s.maintenance }); }
    if (path === '/api/auth/register') {
      requireMethod(request, 'POST'); await throttle(`register:${await digest(ipKey(request))}`, 6, 60);
      const siteSettings = await systemSettings();
      if (siteSettings.maintenance) fail(503, 'Registration is temporarily unavailable during maintenance.');
      if (!siteSettings.registrationOpen) fail(403, 'Registration is temporarily closed.');
      const data = await body(request), name = cleanText(data.name, 100), email = cleanText(data.email, 254).toLowerCase();
      const fields = {};
      if (name.length < 2) fields.name = 'Enter your name (at least 2 characters).';
      if (!emailValid(email)) fields.email = 'Enter a valid email address.';
      if (!passwordValid(data.password)) fields.password = 'Use at least 12 characters and no more than 72 UTF-8 bytes.';
      if (Object.keys(fields).length) fail(422, 'Please check the highlighted fields.', fields);
      if (await db.get('SELECT id FROM users WHERE email=?', email)) fail(409, 'An account could not be created with these details. Try signing in or recovering your password.');
      const stamp = now(), uid = id();
      await db.run('INSERT INTO users(id,name,email,password_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)', uid, name, email, await hashPassword(data.password), stamp, stamp);
      const created = await db.get('SELECT * FROM users WHERE id=?', uid);
      await db.run('INSERT INTO notifications(id,user_id,title,message,created_at) VALUES(?,?,?,?,?)', id(), uid, 'Welcome to FalloutJr', 'Your workspace is ready. Complete your profile to get started.', stamp);
      await audit(created, 'auth.register');
      const emailDelivery = await issueToken(created, 'verify', request);
      return json({ user: userView(created), emailDelivery }, 201, { 'Set-Cookie': await newSession(created, request) });
    }
    if (path === '/api/auth/login') {
      requireMethod(request, 'POST'); const data = await body(request), email = cleanText(data.email, 254).toLowerCase();
      await throttle(`login-ip:${await digest(ipKey(request))}`, 30, 15);
      await throttle(`login-email:${await digest(email)}`, 8, 15);
      const found = await db.get('SELECT * FROM users WHERE email=?', email);
      const valid = await checkPassword(data.password, found?.password_hash || DUMMY_PASSWORD_HASH);
      if (!valid || !found || found.status !== 'active' || (env.NODE_ENV === 'production' && found.is_development)) fail(401, 'Email or password is incorrect.');
      // Every successful login receives a fresh random session; supplied cookies are never adopted.
      const sessionCookie = await newSession(found, request);
      await audit(found, 'auth.login');
      return json({ user: userView(found) }, 200, { 'Set-Cookie': sessionCookie });
    }
    if (path === '/api/auth/logout') {
      requireMethod(request, 'POST'); if (auth) { await db.run('DELETE FROM sessions WHERE id_hash=?', auth.hash); await audit(user, 'auth.logout'); }
      return json({ loggedOut: true }, 200, { 'Set-Cookie': cookie('', request, true) });
    }
    if (path === '/api/auth/forgot-password') {
      requireMethod(request, 'POST'); await throttle(`forgot:${await digest(ipKey(request))}`, 5, 15);
      const data = await body(request), email = cleanText(data.email, 254).toLowerCase();
      if (!emailValid(email)) fail(422, 'Enter a valid email address.', { email: 'Enter a valid email address.' });
      const found = await db.get('SELECT * FROM users WHERE email=? AND status=?', email, 'active');
      if (found && !(env.NODE_ENV === 'production' && found.is_development)) { await issueToken(found, 'reset', request); await audit(found, 'auth.recovery-request'); }
      return json({ message: 'If an active account exists, password reset instructions will be sent.' });
    }
    if (path === '/api/auth/reset-password') {
      requireMethod(request, 'POST'); await throttle(`reset:${await digest(ipKey(request))}`, 10, 15);
      const data = await body(request);
      if (!passwordValid(data.password)) fail(422, 'Use a password of at least 12 characters and no more than 72 UTF-8 bytes.', { password: 'Use 12 or more characters (maximum 72 UTF-8 bytes).' });
      if (typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token)) fail(400, 'This reset link is invalid or expired. Request a new one.');
      const hash = await hashPassword(data.password);
      const token = await db.get("DELETE FROM tokens WHERE id_hash=? AND purpose='reset' AND expires_at>? RETURNING user_id,credential_version", await digest(data.token), Date.now());
      if (!token) fail(400, 'This reset link is invalid or expired. Request a new one.');
      const changed = await db.run('UPDATE users SET password_hash=?,credential_version=credential_version+1,updated_at=? WHERE id=? AND credential_version=?', hash, now(), token.user_id, token.credential_version);
      if (!changed.changes) fail(400, 'This reset link is invalid or expired. Request a new one.');
      await db.run("DELETE FROM tokens WHERE user_id=? AND purpose='reset'", token.user_id);
      await db.run('DELETE FROM sessions WHERE user_id=?', token.user_id);
      await audit(await db.get('SELECT * FROM users WHERE id=?', token.user_id), 'auth.password-reset');
      return json({ message: 'Your password has been reset. Sign in with your new password.' }, 200, { 'Set-Cookie': cookie('', request, true) });
    }
    if (path === '/api/auth/verify-email') {
      requireMethod(request, 'POST'); await throttle(`verify:${await digest(ipKey(request))}`, 20, 15);
      const data = await body(request);
      if (typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token)) fail(400, 'This verification link is invalid or expired.');
      const token = await db.get("DELETE FROM tokens WHERE id_hash=? AND purpose='verify' AND expires_at>? RETURNING user_id", await digest(data.token), Date.now());
      if (!token) fail(400, 'This verification link is invalid or expired.');
      await db.run('UPDATE users SET verified=1,updated_at=? WHERE id=?', now(), token.user_id);
      return json({ verified: true });
    }
    if (path === '/api/contact') {
      requireMethod(request, 'POST');
      if ((await systemSettings()).maintenance) fail(503, 'Contact submissions are temporarily unavailable during maintenance. Please try again later.');
      await throttle(`contact:${await digest(ipKey(request))}`, 5, 60);
      const data = await body(request), fields = {};
      const name = cleanText(data.name, 100), email = cleanText(data.email, 254).toLowerCase(), subject = cleanText(data.subject, 160), message = cleanText(data.message, 5000);
      if (name.length < 2) fields.name = 'Enter your name.';
      if (!emailValid(email)) fields.email = 'Enter a valid email address.';
      if (subject.length < 3) fields.subject = 'Enter a subject (at least 3 characters).';
      if (message.length < 10) fields.message = 'Add a little more detail (at least 10 characters).';
      if (Object.keys(fields).length) fail(422, 'Please check the highlighted fields.', fields);
      await db.run('INSERT INTO contacts(id,name,email,subject,message,created_at) VALUES(?,?,?,?,?,?)', id(), name, email, subject, message, now());
      await audit(user, 'contact.received', subject);
      return json({ message: 'Your message has been received. Thank you for reaching out.' }, 201);
    }
    if (!user) fail(401, 'Sign in to continue.');
    if (path === '/api/auth/resend-verification') {
      requireMethod(request, 'POST'); await throttle(`resend:${user.id}`, 3, 60);
      if (user.verified) return json({ verified: true });
      if (!await issueToken(user, 'verify', request)) fail(503, 'Email delivery is not configured or is temporarily unavailable. Contact the site administrator.');
      return json({ sent: true });
    }
    if (path === '/api/profile') {
      requireMethod(request, 'GET', 'PATCH');
      if (request.method === 'PATCH') {
        const data = await body(request), name = cleanText(data.name, 100);
        if (name.length < 2) fail(422, 'Enter a name with at least 2 characters.', { name: 'Enter at least 2 characters.' });
        await db.run('UPDATE users SET name=?,updated_at=? WHERE id=?', name, now(), user.id); await audit(user, 'profile.updated');
      }
      return json({ user: userView(await db.get('SELECT * FROM users WHERE id=?', user.id)) });
    }
    if (path === '/api/settings') {
      requireMethod(request, 'GET', 'PATCH'); const settings = JSON.parse(user.settings);
      let setCookie;
      if (request.method === 'PATCH') {
        const data = await body(request);
        for (const key of ['emailNotifications', 'productUpdates']) {
          if (key in data && typeof data[key] !== 'boolean') fail(422, 'Choose a valid preference.');
          if (key in data) settings[key] = data[key];
        }
        if (data.newPassword) {
          if (!passwordValid(data.newPassword)) fail(422, 'Use at least 12 characters and at most 72 UTF-8 bytes.', { newPassword: 'Use 12 or more characters (maximum 72 UTF-8 bytes).' });
          await throttle(`password-change:${user.id}`, 8, 15);
          if (!await checkPassword(data.currentPassword, user.password_hash)) fail(422, 'Your current password is incorrect.', { currentPassword: 'Your current password is incorrect.' });
          const nextHash = await hashPassword(data.newPassword);
          const changed = await db.run('UPDATE users SET password_hash=?,credential_version=credential_version+1,updated_at=? WHERE id=? AND password_hash=?', nextHash, now(), user.id, user.password_hash);
          if (!changed.changes) fail(409, 'Your password changed during this request. Sign in again.');
          await db.run("DELETE FROM tokens WHERE user_id=? AND purpose='reset'", user.id);
          await db.run('DELETE FROM sessions WHERE user_id=?', user.id);
          setCookie = await newSession({ ...user, password_hash: nextHash }, request); await audit(user, 'auth.password-changed');
        }
        await db.run('UPDATE users SET settings=?,updated_at=? WHERE id=?', JSON.stringify(settings), now(), user.id); await audit(user, 'settings.updated');
      }
      return json(settings, 200, setCookie ? { 'Set-Cookie': setCookie } : {});
    }
    if (path === '/api/notifications') {
      requireMethod(request, 'GET', 'PATCH');
      if (request.method === 'PATCH') {
        const data = await body(request);
        if (data.all === true) await db.run('UPDATE notifications SET is_read=1 WHERE user_id=?', user.id);
        else if (typeof data.id === 'string' && typeof data.read === 'boolean') await db.run('UPDATE notifications SET is_read=? WHERE id=? AND user_id=?', data.read ? 1 : 0, data.id, user.id);
        else fail(422, 'Choose a notification to update.');
        return json({ updated: true });
      }
      const rows = await db.all('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100', user.id);
      return json({ notifications: rows.map(n => ({ id: n.id, title: n.title, message: n.message, read: !!n.is_read, createdAt: n.created_at })) });
    }
    if (!path.startsWith('/api/admin/')) fail(404, 'This endpoint was not found.');
    const limited = /^\/api\/admin\/(content|logs)(?:\/|$)/.test(path);
    if (user.role !== 'admin' && !(user.role === 'moderator' && limited)) fail(403, 'You do not have permission to access this resource.');
    if (path === '/api/admin/overview') {
      requireMethod(request, 'GET');
      const recent = await db.all('SELECT * FROM audit ORDER BY created_at DESC LIMIT 8');
      return json({ stats: await stats(), recentActivity: recent.map(activityView), chart: await chart(), roleCounts: await db.all('SELECT role,COUNT(*) AS count FROM users GROUP BY role') });
    }
    if (path === '/api/admin/users') {
      requireMethod(request, 'GET');
      const page = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get('page'), 10) || 1)), search = cleanText(url.searchParams.get('search'), 100), role = url.searchParams.get('role');
      const filter = '%' + search.replace(/[\\%_]/g, '\\$&') + '%';
      const where = "WHERE (name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')" + (Object.hasOwn(ROLES, role) ? ' AND role=?' : '');
      const args = [filter, filter, ...(Object.hasOwn(ROLES, role) ? [role] : [])];
      const count = await db.get(`SELECT COUNT(*) AS n FROM users ${where}`, ...args);
      const rows = await db.all(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT 10 OFFSET ?`, ...args, (page - 1) * 10);
      return json({ users: rows.map(userView), pagination: { page, pageSize: 10, total: count.n, totalPages: Math.max(1, Math.ceil(count.n / 10)) } });
    }
    if (/^\/api\/admin\/users\/[^/]+$/.test(path)) {
      requireMethod(request, 'PATCH'); const uid = path.split('/').at(-1), target = await db.get('SELECT * FROM users WHERE id=?', uid);
      if (!target) fail(404, 'This account was not found.');
      const data = await body(request), role = data.role ?? target.role, status = data.status ?? target.status;
      if (!Object.hasOwn(ROLES, role) || !['active', 'suspended'].includes(status)) fail(422, 'Choose a valid role and account status.');
      if (user.id === uid && (role !== 'admin' || status !== 'active')) fail(409, 'You cannot remove your own administrator access.');
      const result = await db.run("UPDATE users SET role=?,status=?,updated_at=? WHERE id=? AND (role!='admin' OR status!='active' OR (?='admin' AND ?='active') OR (SELECT COUNT(*) FROM users WHERE role='admin' AND status='active')>1)", role, status, now(), uid, role, status);
      if (!result.changes) fail(409, 'At least one active administrator must remain.');
      if (role !== target.role || status !== target.status) {
        await db.run('DELETE FROM sessions WHERE user_id=?', uid);
        await db.run("DELETE FROM tokens WHERE user_id=? AND purpose='reset'", uid);
      }
      await audit(user, 'user.updated', `${target.email}: ${role}, ${status}`);
      return json({ user: userView(await db.get('SELECT * FROM users WHERE id=?', uid)) });
    }
    if (path === '/api/admin/permissions') { requireMethod(request, 'GET'); return json({ roles: Object.entries(ROLES).map(([role, permissions]) => ({ role, permissions })) }); }
    if (path === '/api/admin/analytics') { requireMethod(request, 'GET'); const s = await stats(); return json({ chart: await chart(), totals: { users: s.users, sessions: s.activeSessions, contacts: s.contacts, content: s.content }, roleCounts: await db.all('SELECT role,COUNT(*) AS count FROM users GROUP BY role') }); }
    if (path === '/api/admin/logs') {
      requireMethod(request, 'GET'); const page = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get('page'), 10) || 1));
      const where = user.role === 'moderator' ? "WHERE action LIKE 'content.%'" : '';
      const count = await db.get(`SELECT COUNT(*) AS n FROM audit ${where}`);
      const rows = await db.all(`SELECT * FROM audit ${where} ORDER BY created_at DESC LIMIT 20 OFFSET ?`, (page - 1) * 20);
      return json({ logs: rows.map(activityView), pagination: { page, pageSize: 20, total: count.n, totalPages: Math.max(1, Math.ceil(count.n / 20)) } });
    }
    if (path === '/api/admin/settings') {
      requireMethod(request, 'GET', 'PATCH'); const settings = await systemSettings();
      if (request.method === 'PATCH') {
        const data = await body(request);
        for (const key of ['maintenance', 'registrationOpen']) { if (key in data && typeof data[key] !== 'boolean') fail(422, 'Choose a valid setting.'); if (key in data) settings[key] = data[key]; }
        if ('siteName' in data) { settings.siteName = cleanText(data.siteName, 100); if (settings.siteName.length < 2) fail(422, 'Enter a site name with at least 2 characters.'); }
        await db.run('INSERT INTO system_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', 'site', JSON.stringify(settings)); await audit(user, 'system.settings-updated');
      }
      return json(settings);
    }
    if (path === '/api/admin/contacts') { requireMethod(request, 'GET'); return json({ contacts: await db.all('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 100') }); }
    if (path === '/api/admin/content' || /^\/api\/admin\/content\/[^/]+$/.test(path)) {
      const cid = path === '/api/admin/content' ? null : path.split('/').at(-1);
      requireMethod(request, ...(cid ? ['PATCH', 'DELETE'] : ['GET', 'POST']));
      if (request.method === 'GET') return json({ content: (await db.all('SELECT * FROM content ORDER BY updated_at DESC LIMIT 100')).map(contentView) });
      const previous = cid ? await db.get('SELECT * FROM content WHERE id=?', cid) : null;
      if (cid && !previous) fail(404, 'This content was not found.');
      if (request.method === 'DELETE') { await db.run('DELETE FROM content WHERE id=?', cid); await audit(user, 'content.deleted', previous.title); return json({ deleted: true }); }
      const data = await body(request), title = cleanText(data.title ?? previous?.title, 160), text = cleanText(data.body ?? previous?.body, 10000), status = data.status ?? previous?.status ?? 'draft';
      if (title.length < 3 || text.length < 10 || !['draft', 'published'].includes(status)) fail(422, 'Add a title (3+ characters), body (10+ characters), and valid publication status.');
      const contentId = cid || id(), stamp = now();
      if (cid) await db.run('UPDATE content SET title=?,body=?,status=?,updated_at=? WHERE id=?', title, text, status, stamp, cid);
      else await db.run('INSERT INTO content(id,title,body,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)', contentId, title, text, status, user.id, stamp, stamp);
      await audit(user, cid ? 'content.updated' : 'content.created', title);
      return json({ content: contentView(await db.get('SELECT * FROM content WHERE id=?', contentId)) }, cid ? 200 : 201);
    }
    fail(404, 'This endpoint was not found.');
  }

  return async function handle(request) {
    const url = new URL(request.url);
    let response;
    try {
      if (url.pathname.startsWith('/api/')) response = await api(request, url);
      else {
        const roles = routeRoles(url.pathname);
        if (roles) {
          const auth = await session(request);
          if (!auth) return secured(Response.redirect(`${url.origin}/login?next=${encodeURIComponent(url.pathname + url.search)}`, 302), request);
          if (!roles.includes(auth.user.role)) return secured(Response.redirect(`${url.origin}/unauthorized`, 302), request);
        }
        response = assets ? await assets(request) : new Response('Not found', { status: 404 });
      }
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error('Request failed:', error?.name || 'Error');
      response = new Response(JSON.stringify({ error: status === 500 ? 'Something went wrong. Please try again.' : error.message, ...(error.fields ? { fields: error.fields } : {}) }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    return secured(response, request);
  };
}
