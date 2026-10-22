export type Role = 'user' | 'moderator' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type SqlValue = string | number | null | Uint8Array;
export type SqlRow = Record<string, unknown>;
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  status: AccountStatus;
  verified: number;
  is_development: number;
  credential_version: number;
  settings: string;
  created_at: string;
  updated_at: string;
}
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  verified: boolean;
  createdAt: string;
}
export interface Database {
  all(sql: string, ...args: SqlValue[]): Promise<SqlRow[]>;
  get(sql: string, ...args: SqlValue[]): Promise<SqlRow | null | undefined>;
  run(sql: string, ...args: SqlValue[]): Promise<{ changes: number | bigint }>;
}
export interface D1Statement {
  bind(...values: SqlValue[]): D1Statement;
  all(): Promise<{ results: SqlRow[] }>;
  first(): Promise<SqlRow | null>;
  run(): Promise<{ meta?: { changes?: number } }>;
}
export interface D1Binding { prepare(sql: string): D1Statement }
