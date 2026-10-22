# FalloutJr Studio

A responsive developer portfolio and collaboration workspace built from the existing FalloutJr HTML, CSS, and JavaScript site. It preserves the repository’s focus on Unreal Engine, C++, Java, web tools, and creative coding while adding public pages, account flows, and a server-authorized management interface.

The original profile README is preserved in [docs/PROFILE.md](docs/PROFILE.md). Architecture and route details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local installation

Use **Node.js 24 or newer** and npm. Node’s built-in SQLite module powers local persistence; no separate database service is needed.

```sh
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`. Use the exact origin configured in `APP_ORIGIN`; mutation requests from other origins are rejected. The server creates `.data/falloutjr.sqlite` and applies the checked-in schema when it starts. Keep the database and `.env` private and outside source control.

The application requires its server. Opening `index.html` directly or publishing only static files to GitHub Pages cannot provide accounts, contact submission, protected routes, or administration.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` locally; `production` for a production server. |
| `PORT`, `HOST` | Node server port and bind address; defaults `3000` and `0.0.0.0`. |
| `APP_ORIGIN` | Canonical browser origin, including scheme and port. Used for mutation origin checks and account email links. |
| `DATABASE_PATH` | Local SQLite file; default `.data/falloutjr.sqlite`. Unused by a D1-backed Worker. |
| `ENABLE_DEV_ADMIN` | Explicit local seed opt-in; defaults `false`. Production startup rejects `true`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Inputs to the explicit development-admin seed command. They are not runtime fallback credentials. |
| `DEV_MAIL_OUTBOX`, `DEV_MAIL_OUTBOX_PATH` | Opt-in, local-only account mail outbox and its private path (default `.data/mail-outbox.ndjson`). Keep output disabled in production. |
| `MAIL_API_URL` | HTTPS transactional email endpoint. |
| `MAIL_API_TOKEN` | Bearer token for that email endpoint; store as a runtime secret. |
| `MAIL_FROM` | Verified sender accepted by the configured email service. |

`.env.example` contains placeholders only. Use a unique password of at least **12 characters** and at most **72 UTF-8 bytes**. Never commit `.env`, account links, database files, or actual secrets.

## Development administrator

1. Copy `.env.example` to `.env`.
2. Set `ENABLE_DEV_ADMIN=true` locally and replace `ADMIN_EMAIL` and `ADMIN_PASSWORD` with local test values. The seed rejects the example password.
3. Run `npm run seed:admin`.
4. Start the application and sign in at `/login` with those values.
5. Visit `/admin` to manage users, content, settings, and audit records.

The seed marks its account as a development account in the database. Production login and session checks reject that account even if its password is changed or the seed environment values are removed. The seed is an explicit development operation and refuses to run in production. It requires `ENABLE_DEV_ADMIN=true`; production startup rejects that setting. Re-running the seed updates the configured development account, restores its admin access, and revokes its sessions. To rotate the development password from the CLI, change `ADMIN_PASSWORD` in `.env` and run the seed again. Passwords are stored as bcrypt hashes with cost 12. Application startup never creates an administrator automatically.

To change a password while signed in, open `/settings`, provide the current password, and enter a new one. Password changes invalidate existing sessions and rotate the current session. An emailed recovery link can also change a password when email delivery is configured; completing recovery invalidates all sessions.

Use `/admin/users` to assign `user`, `moderator`, or `admin` roles and to suspend accounts. Role/status changes invalidate that user’s sessions. The server prevents an administrator from removing their own administrator access and prevents removal of the final active administrator.

To disable or remove the local development account, keep the local seed opt-in enabled and run:

```sh
npm run seed:admin -- --disable
# Or remove the account; authored content must first be reassigned or deleted.
npm run seed:admin -- --remove
```

Both operations revoke sessions. Set `ENABLE_DEV_ADMIN=false` after cleanup.

Before production, use a separate production database, omit development-admin variables, leave local mail output disabled, and do not run the development seed. If a development database was reused, first provision a legitimate administrator, then suspend the development account through `/admin/users` and remove its environment values. Merely removing an environment variable does not remove an already-created database account.

## Roles and permissions

| Visitor | Access |
| --- | --- |
| Guest | Public pages and account entry/recovery forms. No protected pages or private APIs. |
| User | Own dashboard, profile, account preferences, password changes, and notifications. |
| Moderator | User capabilities, content management, and content-related audit events only. |
| Admin | Complete overview, user and role management, analytics, content, system settings, contact submissions, and audit records. |

Role definitions are fixed in server code. The permissions page displays the policy; role assignment happens in user management. Clients cannot grant themselves a role during registration or profile updates. Unauthorized API calls receive `401` or `403`. Protected page requests redirect to `/login` or `/unauthorized` as appropriate. The browser interface is an additional convenience layer; server checks remain authoritative.

Email verification confirms control of an address. An unverified account can use its ordinary workspace; verification does not grant management privileges.

## Email delivery

Registration and password recovery create short-lived, single-use links. Verification links expire after 24 hours; password reset links expire after 30 minutes. The database stores only token hashes.

For production, configure `MAIL_API_URL`, `MAIL_API_TOKEN`, `MAIL_FROM`, and the correct `APP_ORIGIN`. The endpoint must accept:

```http
POST /your-email-endpoint
Authorization: Bearer <runtime secret>
Content-Type: application/json
```

```json
{
  "to": "recipient@example.com",
  "from": "configured sender",
  "subject": "Account email subject",
  "text": "Plain-text message containing a single-use link"
}
```

A successful HTTP status means the endpoint accepted delivery. Use an adapter if your chosen mail provider requires a different payload. The application does not include a provider account or silently claim to have delivered mail without configuration. Recovery responses deliberately do not reveal whether an email address is registered. Missing or failing email delivery must be resolved before relying on recovery in production.

Local development can opt in to `DEV_MAIL_OUTBOX=true` to inspect account links in `.data/mail-outbox.ndjson` (or `DEV_MAIL_OUTBOX_PATH`) without sending mail. Treat the output as private account credentials and delete it after testing. It must never be served as a static asset or enabled on a production host.

Contact submissions are saved in the database for administrator review. They are not automatically forwarded by email.

## Commands and checks

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the local Node server, reading `.env` when present. |
| `npm start` | Run the Node server. Set production environment values for a production host. |
| `npm run seed:admin` | Explicitly create/configure a local development administrator. |
| `npm run lint` | ESLint source checks. |
| `npm run typecheck` | TypeScript compiler/module validation for the JavaScript project. |
| `npm test` | Node test suite, including authentication and server authorization. |
| `npm run test:browser` | Six Playwright integration tests for forms, navigation, responsive layouts, and accessibility. |
| `npm run build` | Build the production deployment artifact. |
| `npm run check` | Run lint, compiler validation, tests, and the production build in order. |

For browser tests, install the test browser with `npx playwright install chromium`, then run `npm run test:browser`. To use an existing Chromium installation, set `BROWSER_EXECUTABLE_PATH` for the command (for example, `BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser`). Browser tests start their own server on port 3100 and reset only the dedicated `work/browser-test.sqlite` fixture. They require local socket access.

The build also runs the bundled Worker against a fresh SQL fixture to verify assets, the D1 interface, bcrypt, sessions, role enforcement, and logout.

The project remains JavaScript; compiler validation does not imply comprehensive static typing. Test data is isolated from the normal development database.

## Production deployment

### Node server

1. Install Node 24+ and dependencies with `npm ci`.
2. Run `npm run check` in the build environment.
3. Configure `NODE_ENV=production`, the HTTPS `APP_ORIGIN`, a writable persistent `DATABASE_PATH`, and the transactional email settings.
4. Run `npm start` behind an HTTPS reverse proxy/process supervisor. Keep SQLite on durable local storage; back it up consistently, including WAL handling. Do not put the database on an ephemeral build filesystem.
5. Provision a production administrator through the controlled process below; do not enable the development seed in production.
6. Verify login, logout, email delivery, recovery, role enforcement, and database backups against the actual host.

HTTPS is required for production session cookies. Match `APP_ORIGIN` to the public origin. Avoid a multi-instance Node deployment sharing a SQLite file; use the D1 Worker deployment or another designed database adapter for that topology.

### Cloudflare Worker / Sites

The Worker entry uses the same API and permission policy with a D1 adapter. Build the source with `npm run build`, bind the D1 database as `DB`, and apply **all** checked-in SQL migrations in filename order before serving requests. Local startup records applied migrations in `_local_migrations`; hosted D1 migrations are managed by the deployment platform.

The build produces:

```text
dist/
├── client/                 # index.html, assets, CSS, browser JavaScript
├── server/
│   ├── index.js            # Bundled Worker entry
│   └── wrangler.json       # Generated deployment configuration
├── migrations/            # Schema migrations
└── .openai/hosting.json    # Sites identity and storage declarations
```

Deploy the bundled Worker together with its asset directory and hosting metadata; the static asset binding is `ASSETS`. Keep `run_worker_first` enabled so protected page requests always reach server authorization. The generated D1 database ID is a placeholder for platform binding; replace it with the real database ID for a standalone Wrangler deployment. Never treat the placeholder as a provisioned database.

The checked-in `.openai/hosting.json` identifies the selected Sites project. Preserve its `project_id` when updating the deployment. Local SQLite and hosted D1 are separate databases; development data and accounts are not copied to production. Configure mail secrets in the hosting service, not in the hosting manifest or source files.

The intended Site origin is `https://falloutjr-studio.ddrahosjr.chatgpt.site`; a configured origin is not evidence of successful publication. Set the actual deployed origin as `APP_ORIGIN` and validate the deployed version. Sites audience restrictions and the application’s account roles are independent access layers.

### Provision the first production administrator

Use a normal production account, not the development seed. Configure email delivery, register the intended owner, and complete email verification. Confirm the account’s identity in a trusted database console. With controlled database access, execute this parameterized statement using the verified account ID and email as the two bound parameters:

```sql
UPDATE users
SET role = 'admin'
WHERE id = ? AND email = ? AND verified = 1 AND is_development = 0;
```

Verify exactly one row changed, then revoke that account’s prior sessions with `DELETE FROM sessions WHERE user_id = ?` using the same bound ID. Sign in again and confirm `/admin` access. Record this operational access change. Subsequent role assignments should use the audited admin UI. A development-marked account cannot be promoted into a usable production account by this statement.

## Design, accessibility, and content

The interface uses reusable CSS tokens, responsive layouts, visible keyboard focus, labelled forms, status feedback, and reduced-motion support. The public portfolio preserves its light/dark theme control and saved `themePreference`; account and management screens remain dark. SVG artwork stays sharp at 4K without large raster downloads. Public project artwork and dashboard mockups are illustrations, not screenshots or claims of shipped products. Pricing is an engagement guide rather than a checkout or payment system. No invented clients or testimonials are presented as evidence.

Review keyboard navigation, narrow mobile screens, touch controls, and contrast whenever content or theme tokens change. Keep runtime dependencies and the Node version current. Before production, confirm backups, operational admin ownership, email delivery, rate limiting behind your chosen proxy, and the deployment’s access policy.
