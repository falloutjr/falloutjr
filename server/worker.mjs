import { createApp } from './app.mjs';
import { d1Database } from './d1.mjs';

export default {
  async fetch(request, env) {
    if (env.ENABLE_DEV_ADMIN === 'true') return new Response('Disable development account setup before production.', { status: 503 });
    if (!env.DB || !env.ASSETS) return new Response('Site storage is not configured.', { status: 503 });
    const assets = async request => {
      const url = new URL(request.url);
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Not found', { status: 404 }); }
      if (pathname.split('/').some(segment => segment.startsWith('.'))) return new Response('Not found', { status: 404 });
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
      if (/^\/(assets|css|js|fonts)\//.test(url.pathname) || /^\/(favicon\.(svg|ico)|robots\.txt|sitemap\.xml)$/.test(url.pathname)) return env.ASSETS.fetch(request);
      if (!/^\/(?:about|features|services|pricing|contact|privacy|terms|login|register|forgot-password|reset-password|verify-email|unauthorized|dashboard|profile|settings|account|notifications|admin(?:\/(?:users|permissions|analytics|content|settings|logs))?)?\/?$/.test(url.pathname) && url.pathname !== '/index.html') return new Response('Page not found', { status: 404 });
      url.pathname = '/index.html';
      return env.ASSETS.fetch(new Request(url, request));
    };
    return createApp({ db: d1Database(env.DB), env: { ...env, NODE_ENV: 'production' }, assets })(request);
  },
};
