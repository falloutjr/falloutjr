// @ts-check
import { emailValid } from './security.mjs';

const KEY = 'admin_bootstrap_used';
const DAY = 24 * 60 * 60 * 1000;
const invalid = () => new Error('Administrator setup configuration is invalid.');

/**
 * Explicit, expiring provisioning from trusted hosting secrets. This creates data
 * only; deployment migrations must already have initialized the schema.
 * @param {import('./types.js').Database} db
 * @param {Record<string, unknown>} env
 * @returns {Promise<boolean>}
 */
export async function provisionAdmin(db, env) {
  const values = [env.ADMIN_BOOTSTRAP_EMAIL, env.ADMIN_BOOTSTRAP_PASSWORD_HASH, env.ADMIN_BOOTSTRAP_EXPIRES];
  if (values.every(value => value === undefined || value === null || value === '')) return false;
  if (!values.every(value => typeof value === 'string' && value.length > 0)) throw invalid();
  const email = String(env.ADMIN_BOOTSTRAP_EMAIL).trim().toLowerCase();
  const hash = String(env.ADMIN_BOOTSTRAP_PASSWORD_HASH);
  const expires = String(env.ADMIN_BOOTSTRAP_EXPIRES);
  const expiry = Date.parse(expires);
  if (!emailValid(email) || !/^\$2[aby]\$(?:12|13|14|15)\$[./A-Za-z0-9]{53}$/.test(hash) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(expires) || !Number.isFinite(expiry)) throw invalid();
  const currentTime = Date.now();
  if (expiry <= currentTime) return false;
  if (expiry > currentTime + DAY) throw invalid();
  if (await db.get('SELECT key FROM system_settings WHERE key=?', KEY)) return false;

  const uid = crypto.randomUUID();
  const stamp = new Date(currentTime).toISOString();
  // A single guarded statement arbitrates concurrent Worker invocations. Existing
  // email addresses, passwords, roles, and production administrators are retained.
  const result = await db.run(`INSERT OR IGNORE INTO users
    (id,name,email,password_hash,role,status,verified,is_development,credential_version,created_at,updated_at)
    SELECT ?,?,?,?,'admin','active',1,0,0,?,?
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='admin')
      AND NOT EXISTS (SELECT 1 FROM system_settings WHERE key=?)`,
  uid, 'Site Administrator', email, hash, stamp, stamp, KEY);
  if (!Number(result.changes)) return false;
  await db.run('INSERT OR IGNORE INTO system_settings(key,value) VALUES(?,?)', KEY, JSON.stringify({ userId: uid, createdAt: stamp }));
  await db.run('INSERT INTO audit(id,actor_id,actor_name,action,target,created_at) VALUES(?,?,?,?,?,?)', crypto.randomUUID(), uid, 'System setup', 'admin.provisioned', email, stamp);
  return true;
}
