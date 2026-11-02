// Cloudflare Worker: serves /api/* and leaves everything else to the static
// web build (see wrangler.jsonc). Secrets such as XAI_API_KEY reach the shared
// code through process.env via the nodejs_compat flag.
import * as routes from './routes.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const json = ([status, body]) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } });

const MAX_BODY = 12 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (pathname === '/api/health' && request.method === 'GET') return json(routes.health());
    if (pathname === '/api/search' && request.method === 'GET') return json(await routes.search(url.searchParams.get('q')));
    const cardMatch = pathname.match(/^\/api\/cards\/([^/]+)$/);
    if (cardMatch && request.method === 'GET') return json(await routes.card(decodeURIComponent(cardMatch[1])));

    if (pathname === '/api/identify' && request.method === 'POST') {
      // Each scan spends xAI credit, so cap scans per visitor.
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      if (env.IDENTIFY_LIMITER) {
        const { success } = await env.IDENTIFY_LIMITER.limit({ key: ip });
        if (!success) return json([429, { error: 'Too many scans in a short time. Wait a minute and try again.' }]);
      }
      if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return json([413, { error: 'Photo is too large.' }]);
      let body;
      try {
        body = await request.json();
      } catch {
        return json([400, { error: 'Invalid JSON body.' }]);
      }
      return json(await routes.identify(body));
    }
    return json([404, { error: 'Not found.' }]);
  },
};
