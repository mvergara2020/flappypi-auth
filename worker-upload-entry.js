import baseWorker from "./worker-fast-entry.js";
import { routeSponsors } from "./sponsor.worker.js";

const MAX_SHARED_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.81:3000",
  "https://192.168.1.81:3000",
  "https://qa.classic.flappypi.com",
  "https://classic.flappypi.com"
]);

function isSharedImageUpload(request) {
  if (request.method !== "POST") return false;
  const path = new URL(request.url).pathname;
  return path === "/game/photo" || path === "/sponsors" || path === "/sponsors/pi-create";
}

function isSponsorRoute(request) {
  const path = new URL(request.url).pathname;
  return path === "/sponsors" || path.startsWith("/sponsors/");
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };
}

function finalizeResponse(response) {
  if (!(response instanceof Response)) return response;
  const headers = new Headers(response.headers);

  /*
    IMPORTANT:
    Several lower worker layers enrich/rewrite JSON bodies (/me, game results,
    shop responses, etc.). Never let a stale Content-Length survive that chain.
    Wrangler/Cloudflare must frame the final body from the actual bytes.
  */
  headers.delete("Content-Length");
  headers.set("X-FlappyPi-Response-Framing", "auto");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(request, body, status = 200) {
  return finalizeResponse(new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-FlappyPi-Upload-Entry": "2026-08-09-sponsors-v3"
    }
  }));
}

function tooLarge(request, actualBytes = null) {
  return json(request, {
    ok: false,
    code: "IMAGE_UPLOAD_TOO_LARGE",
    max_bytes: MAX_SHARED_IMAGE_BYTES,
    max_kb: 5120,
    actual_bytes: actualBytes
  }, 413);
}

async function bodyExceedsLimit(request, maxBytes) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) return { exceeds:true, bytes:declared };

  const body = request.clone().body;
  if (!body) return { exceeds:false, bytes:0 };

  const reader = body.getReader();
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value?.byteLength || 0;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch (_) {}
        return { exceeds:true, bytes:total };
      }
    }
  } finally {
    try { reader.releaseLock(); } catch (_) {}
  }

  return { exceeds:false, bytes:total };
}

async function requireUserThroughActiveWorker(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = "/me";
  url.search = "?lvl_loaded=1";

  const response = await baseWorker.fetch(new Request(url.toString(), {
    method: "GET",
    headers: request.headers
  }), env, ctx);

  if (!response?.ok) return null;
  const user = await response.json().catch(() => null);
  return user?.id ? user : null;
}

async function handleFetch(request, env, ctx) {
  if (request.method === "OPTIONS") {
    return finalizeResponse(await baseWorker.fetch(request, env, ctx));
  }

  if (isSharedImageUpload(request)) {
    const size = await bodyExceedsLimit(request, MAX_SHARED_IMAGE_BYTES);
    if (size.exceeds) return tooLarge(request, size.bytes);
  }

  if (isSponsorRoute(request)) {
    const sponsorResponse = await routeSponsors(request, env, {
      corsHeaders,
      requireUser: () => requireUserThroughActiveWorker(request, env, ctx)
    });
    if (sponsorResponse) return finalizeResponse(sponsorResponse);
    return json(request, { ok:false, code:"SPONSOR_ROUTE_NOT_FOUND" }, 404);
  }

  return finalizeResponse(await baseWorker.fetch(request, env, ctx));
}

export default {
  fetch: handleFetch,
  async queue(batch, env, ctx) {
    return baseWorker.queue(batch, env, ctx);
  }
};
