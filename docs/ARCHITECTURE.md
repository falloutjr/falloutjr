# Architecture

## Repository evolution

The original project was a static portfolio: `index.html`, `css/style.css`, and `js/main.js`, with no package manager, application framework, database, or API. The upgraded application retains semantic HTML, CSS, browser JavaScript modules, the GitHub links, and the original engineering/project subject matter. A backend is added because secure account and permission handling cannot be implemented on a static host alone.

## Components

- `index.html`: document metadata, asset entry points, skip link, app mount, and live toast region.
- `js/main.js`: navigation, public shell, route changes, and account lookup.
- `js/shared.js`: API client, escaped text rendering, icons, navigation, and toasts.
- `js/public.js`: public pages and public interactions.
- `js/portal.js`: account forms and protected user/management interfaces.
- `css/`: shared design system and portal styles.
- `assets/`: self-contained vector artwork and optimized local fonts.
- `server/app.mjs`: shared Web Request/Response API and server page authorization.
- `server/security.mjs`: password handling, public user projection, role policy, token generation, and validation primitives.
- `server/database.mjs`: local Node SQLite adapter.
- `server/d1.mjs`: hosted D1 adapter with the same asynchronous query interface.
- `server/index.mjs`: local/Node HTTP entry point and permitted static assets.
- `server/worker.mjs`: Worker entry point with D1 and asset bindings.
- `migrations/`: schema definitions applied before requests.
- `scripts/`: production build and explicit development-admin setup.
- `tests/`: isolated server/security tests.

The frontend does not own authentication state. It reads `/api/auth/me` and uses same-origin API requests. User-generated text is escaped when inserted into HTML; server SQL uses bound parameters.

## Route policy

| Pages | Minimum access |
| --- | --- |
| `/`, `/about`, `/services`, `/pricing`, `/contact`, legal pages | Guest |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/unauthorized` | Guest; token/account state controls individual actions |
| `/dashboard`, `/profile`, `/settings`, `/notifications` | Active signed-in account |
| `/admin/content`, `/admin/logs` | Moderator or admin; moderators see only content audit records |
| `/admin`, `/admin/users`, `/admin/permissions`, `/admin/analytics`, `/admin/settings` | Admin |

Every protected HTML request is checked by the server, including a direct URL visit. Every private API independently resolves the session and checks role/ownership. The client route checks do not substitute for these checks.

## Authentication lifecycle

1. Registration validates name, email, and a 12-character minimum password with a 72-byte maximum. It creates the fixed `user` role, a welcome notification, and an email-verification token.
2. Passwords use bcrypt cost 12. The server never returns hashes or passwords in user data.
3. Login verifies the password and active account status, applies database-backed attempt limits, and creates a fresh random 256-bit opaque token. A SHA-256 digest identifies the session in the database; the raw token is only in the browser’s cookie.
4. The session cookie is `HttpOnly`, `SameSite=Lax`, path-scoped to `/`, and `Secure` on HTTPS/production. Sessions expire after 12 hours.
5. Mutating API requests require the configured same-origin `Origin` header. JSON content type, body size, field validation, and bound SQL protect the request boundary.
6. Logout deletes the current session record and clears the cookie. Password recovery revokes all sessions. A password change revokes all sessions, invalidates prior reset tokens, and issues a replacement current session. Credential versions reject reset tokens issued before a password change. Session insertion is conditioned on the password hash that was authenticated, preventing an in-flight old-password login from issuing a session after a concurrent reset. Role/status changes also invalidate sessions.
7. Recovery and verification tokens are random, hashed at rest, expire, and are consumed once. Recovery responses are generic to limit account enumeration.

The Node entry confines static files to approved public subtrees and rejects encoded traversal and foreign/protocol-relative request targets. The application sets CSP, anti-framing, MIME-sniffing, referrer, permissions, and HTTPS transport headers. Logs avoid secrets. Browser pages cannot read the session cookie. Production origin and reverse-proxy configuration remain deployment responsibilities.

## Data ownership and administration

SQLite/D1 stores users, sessions, account tokens, notifications, contact submissions, content, audit records, rate-limit counters, and system settings. A follow-up migration adds an `is_development` marker to accounts created or updated by the development seed. Both login and session resolution reject marked accounts in production; hosted Workers always use production mode. Foreign keys constrain account-owned records. No browser local storage is used as the authority for permissions or private records.

Ordinary profile/settings/notification queries are tied to the session user’s ID. Moderator management is limited to content and content-related audit events. Admin user updates enforce a valid role/status, prevent self-demotion/suspension, preserve an active administrator, and revoke affected sessions. Permission definitions are code-owned and displayed in the admin UI; they are not editable free-form permission strings.

Charts summarize actual database records. A new database can show empty states and zero totals. The application does not manufacture revenue, customers, or usage to populate those charts.

## Runtime and deployment boundaries

Local development and a standalone Node deployment use Node 24’s SQLite support and a private database path. Hosted execution uses the Worker-compatible shared handler and D1, with static assets supplied by the platform. Neither deployment needs a client framework or third-party identity SDK.

Email is an explicit external integration. A configurable bearer-authenticated HTTP endpoint accepts `{to, from, subject, text}`. Missing mail configuration does not expose tokens through an API. Local private outbox support is development-only. A production deployment must provision its own mail provider, production administrator, durable storage, backups, and monitoring.

Production build output is generated; edit source files rather than `dist/`. Public assets are under `dist/client/`; the bundled entry and deployment configuration are `dist/server/index.js` and `dist/server/wrangler.json`; SQL migrations are copied to `dist/migrations/`; Sites metadata is copied to `dist/.openai/hosting.json`. Asset routing must run through the Worker before static delivery for protected pages. Secrets and runtime state must stay out of source archives and Git. The Sites source project ID is configuration, not a credential, and should be preserved on subsequent updates.
