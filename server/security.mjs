// @ts-check
import bcrypt from 'bcryptjs';

/** @param {unknown} password @returns {password is string} */
export const passwordValid = password => typeof password === 'string' && password.length >= 12 && new TextEncoder().encode(password).length <= 72;
/** @param {string} password @returns {Promise<string>} */
export async function hashPassword(password) {
  if (!passwordValid(password)) throw new Error('Use 12 or more characters and no more than 72 UTF-8 bytes.');
  return bcrypt.hash(password, 12);
}
/** @param {unknown} password @param {string} hash @returns {Promise<boolean>} */
export async function checkPassword(password, hash) {
  const validLength = passwordValid(password);
  const valid = await bcrypt.compare(validLength ? password : '', hash);
  return valid && validLength;
}
/** @returns {string} */
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
}
/** @param {string} value @returns {Promise<string>} */
export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
/** @param {import('./types.js').UserRecord | null | undefined} row @returns {import('./types.js').PublicUser | null} */
export const userView = row => row ? ({ id: row.id, name: row.name, email: row.email, role: row.role, status: row.status, verified: !!row.verified, createdAt: row.created_at }) : null;
/** @param {unknown} value @returns {value is string} */
export const emailValid = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
/** @param {unknown} value @param {number} [max] @returns {string} */
export const cleanText = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
/** @type {Readonly<Record<import('./types.js').Role, readonly string[]>>} */
export const ROLES = {
  user: ['dashboard:read', 'profile:write', 'settings:write', 'notifications:read'],
  moderator: ['dashboard:read', 'profile:write', 'settings:write', 'notifications:read', 'content:manage', 'audit:read-limited'],
  admin: ['dashboard:read', 'profile:write', 'settings:write', 'notifications:read', 'users:manage', 'roles:assign', 'analytics:read', 'content:manage', 'settings:manage', 'audit:read'],
};
/** @param {string} path @returns {import('./types.js').Role[] | null} */
export function routeRoles(path) {
  if (/^\/admin(?:\/|$)/.test(path)) return /^\/admin\/(content|logs)(?:\/|$)/.test(path) ? ['admin', 'moderator'] : ['admin'];
  if (/^\/(dashboard|profile|settings|notifications|account)(?:\/|$)/.test(path)) return ['user', 'moderator', 'admin'];
  return null;
}
