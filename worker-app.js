import coreWorker from "./worker-entry.js";

const EXTRA_ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.81:3000",
  "https://192.168.1.81:3000",
  "https://qa.classic.flappypi.com",
  "https://classic.flappypi.com"
]);

function withCors(request, response) {
  const origin = request.headers.get("Origin");
  if (!origin || !EXTRA_ALLOWED_ORIGINS.has(origin)) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.append("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function rewriteAlias(request) {
  const url = new URL(request.url);

  /* Frontend platform layer uses a compact generic alias. */
  if (request.method === "GET" && url.pathname === "/shop/catalog") {
    url.pathname = "/shop/flappycoin/catalog";
    return new Request(url.toString(), request);
  }

  return request;
}

export default {
  async fetch(request, env, ctx) {
    const routedRequest = rewriteAlias(request);
    const response = await coreWorker.fetch(routedRequest, env, ctx);
    return withCors(request, response);
  },

  async queue(batch, env, ctx) {
    return coreWorker.queue(batch, env, ctx);
  }
};
