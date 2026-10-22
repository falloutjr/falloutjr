import { openDatabase } from '../server/database.mjs';
import { hashPassword, emailValid, passwordValid } from '../server/security.mjs';

export async function seedAdmin({ db, env, disable = false, remove = false }) {
  if (env.NODE_ENV === 'production') throw new Error('Development account setup is disabled in production.');
  if (env.ENABLE_DEV_ADMIN !== 'true') throw new Error('Set ENABLE_DEV_ADMIN=true locally to explicitly enable the development account.');
  const email = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!emailValid(email)) throw new Error('Set a valid ADMIN_EMAIL in your local environment.');
  const existing = await db.get('SELECT * FROM users WHERE email=?', email);
  if (disable || remove) {
    if (!existing) throw new Error('The development account does not exist.');
    await db.run('DELETE FROM sessions WHERE user_id=?', existing.id);
    await db.run('DELETE FROM tokens WHERE user_id=?', existing.id);
    if (remove) {
      const authored = await db.get('SELECT COUNT(*) AS count FROM content WHERE created_by=?', existing.id);
      if (authored.count) throw new Error('Reassign or remove content authored by this account before removing it. Use --disable to revoke access now.');
      await db.run('DELETE FROM users WHERE id=?', existing.id);
    } else await db.run('UPDATE users SET status=? WHERE id=?', 'suspended', existing.id);
    return remove ? 'Development account removed.' : 'Development account disabled and sessions revoked.';
  }
  const password = env.ADMIN_PASSWORD;
  if (!passwordValid(password) || ['change-this-password', 'change-me-now', 'password12345'].includes(password)) throw new Error('Set a unique ADMIN_PASSWORD (12+ characters, at most 72 UTF-8 bytes); replace the example placeholder.');
  const stamp = new Date().toISOString(), passwordHash = await hashPassword(password);
  if (existing) {
    await db.run("UPDATE users SET password_hash=?,role='admin',status='active',verified=1,is_development=1,credential_version=credential_version+1,updated_at=? WHERE id=?", passwordHash, stamp, existing.id);
    await db.run('DELETE FROM sessions WHERE user_id=?', existing.id);
    await db.run("DELETE FROM tokens WHERE user_id=? AND purpose='reset'", existing.id);
  } else {
    await db.run("INSERT INTO users(id,name,email,password_hash,role,verified,is_development,created_at,updated_at) VALUES(?,?,?,?,'admin',1,1,?,?)", crypto.randomUUID(), env.ADMIN_NAME || 'Development Admin', email, passwordHash, stamp, stamp);
  }
  return 'Development administrator configured. Previous sessions were revoked.';
}

if (process.argv[1]?.endsWith('/seed-admin.mjs') || process.argv[1] === 'scripts/seed-admin.mjs') {
  const db = openDatabase();
  try { console.log(await seedAdmin({ db, env: process.env, disable: process.argv.includes('--disable'), remove: process.argv.includes('--remove') })); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { db.close(); }
}
