import { createServer as httpServer } from 'node:http';
import { readFile, appendFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname, dirname, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { openDatabase } from './database.mjs';
import { createApp } from './app.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json' };

export function createServer({ db = openDatabase(), env = process.env, root = ROOT, deliverMail } = {}) {
  if (env.NODE_ENV === 'production' && env.ENABLE_DEV_ADMIN === 'true') throw new Error('Disable ENABLE_DEV_ADMIN before production.');
  const appOrigin = env.APP_ORIGIN || `http://localhost:${env.PORT || 3000}`;
  if (!deliverMail && env.DEV_MAIL_OUTBOX === 'true' && env.NODE_ENV !== 'production') {
    const outbox = resolve(env.DEV_MAIL_OUTBOX_PATH || '.data/mail-outbox.ndjson');
    deliverMail = async mail => {
      await mkdir(dirname(outbox), { recursive: true, mode: 0o700 });
      await appendFile(outbox, JSON.stringify({ ...mail, createdAt: new Date().toISOString() }) + '\n', { mode: 0o600 });
      return true;
    };
  }
  const assets = async request => {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url).pathname); } catch { return new Response('Not found', { status: 404 }); }
    if (pathname.split('/').some(segment => segment.startsWith('.'))) return new Response('Not found', { status: 404 });
    const isAsset = /^\/(assets|css|js|fonts)\/[a-zA-Z0-9_./-]+$/.test(pathname) || /^\/(favicon\.(svg|ico)|robots\.txt|sitemap\.xml)$/.test(pathname);
    const filename = isAsset ? resolve(root, '.' + pathname) : resolve(root, 'index.html');
    if (isAsset && /^\/(assets|css|js|fonts)\//.test(pathname)) {
      const subtree = resolve(root, pathname.split('/')[1]) + sep;
      if (!filename.startsWith(subtree)) return new Response('Not found', { status: 404 });
    }
    if (!filename.startsWith(resolve(root) + sep)) return new Response('Not found', { status: 404 });
    const knownRoute = /^\/(?:about|features|services|pricing|contact|privacy|terms|login|register|forgot-password|reset-password|verify-email|unauthorized|dashboard|profile|settings|account|notifications|admin(?:\/(?:users|permissions|analytics|content|settings|logs))?)?\/?$/.test(pathname) || pathname === '/index.html';
    if (!isAsset && !knownRoute) return new Response('Page not found', { status: 404 });
    try {
      if (!(await stat(filename)).isFile()) return new Response('Not found', { status: 404 });
      const data = await readFile(filename);
      return new Response(request.method === 'HEAD' ? null : data, { headers: { 'Content-Type': MIME[extname(filename)] || 'application/octet-stream', 'Cache-Control': isAsset ? 'public, max-age=3600' : 'no-cache' } });
    } catch { return new Response('Not found', { status: 404 }); }
  };
  const app = createApp({ db, env: { ...env, APP_ORIGIN: appOrigin }, deliverMail, assets });
  const server = httpServer(async (req, res) => {
    try {
      if (!req.url?.startsWith('/') || req.url.startsWith('//')) {
        res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid request target.' })); return;
      }
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 20000) { res.writeHead(413, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'This submission is too large.' })); return; }
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      // Never trust client-provided IP forwarding headers on the standalone server.
      headers.set('X-Client-IP', req.socket.remoteAddress || 'local'); headers.delete('CF-Connecting-IP');
      const init = { method: req.method, headers };
      if (!['GET', 'HEAD'].includes(req.method) && size) init.body = Buffer.concat(chunks);
      const target = new URL(req.url, appOrigin);
      if (target.origin !== new URL(appOrigin).origin) throw new Error('Invalid request origin');
      const request = new Request(target, init);
      const response = await app(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch { if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'The request could not be processed.' })); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return { server, db };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { server, db } = createServer();
  const port = Number(process.env.PORT || 3000);
  server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`FalloutJr running on http://localhost:${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
