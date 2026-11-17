// data.nysgpt.com: passes every request to the Data Library API (AWS Lambda) with the caller's address.
export default {
  async fetch(request, env) {
    const u = new URL(request.url); const h = new Headers(request.headers);
    h.set('x-proxy-secret', env.PROXY_SECRET); h.set('x-client-ip', request.headers.get('cf-connecting-ip') || ''); h.set('x-public-host', u.host); h.delete('host');
    return fetch(env.ORIGIN + u.pathname + u.search, { method: request.method, headers: h, body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body, redirect: 'manual' });
  },
};
