import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, check } from 'drizzle-orm/sqlite-core';

// Hosted D1 schema mirrors the final state of migrations/0001 through 0003.
// Node's _local_migrations registry is intentionally local to the Node adapter.
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  status: text('status').notNull().default('active'),
  verified: integer('verified').notNull().default(0),
  settings: text('settings').notNull().default('{"emailNotifications":true,"productUpdates":false}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  isDevelopment: integer('is_development').notNull().default(0),
  credentialVersion: integer('credential_version').notNull().default(0),
}, table => [
  check('users_role_check', sql`${table.role} IN ('user','moderator','admin')`),
  check('users_status_check', sql`${table.status} IN ('active','suspended')`),
]);
export const sessions = sqliteTable('sessions', {
  idHash: text('id_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('sessions_user').on(table.userId)]);
export const tokens = sqliteTable('tokens', {
  idHash: text('id_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(),
  expiresAt: integer('expires_at').notNull(),
  credentialVersion: integer('credential_version').notNull().default(0),
}, table => [check('tokens_purpose_check', sql`${table.purpose} IN ('reset','verify')`)]);
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: integer('is_read').notNull().default(0),
  createdAt: text('created_at').notNull(),
});
export const content = sqliteTable('content', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('draft'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [check('content_status_check', sql`${table.status} IN ('draft','published')`)]);
export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
});
export const audit = sqliteTable('audit', {
  id: text('id').primaryKey(),
  actorId: text('actor_id'),
  actorName: text('actor_name').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull().default(''),
  createdAt: text('created_at').notNull(),
}, table => [index('audit_created').on(table.createdAt)]);
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: integer('reset_at').notNull(),
});
export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
