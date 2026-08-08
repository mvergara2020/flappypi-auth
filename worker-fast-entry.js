import appWorker from "./worker-app.js";
import { routeShopCatalog } from "./shop-catalog.worker.js";

const ENTRY_VERSION = "2026-08-08-shop-catalog-v3";

function diagnosticJson(request, body, status = 200, extraHeaders = {}) {
  const text = JSON.stringify(body, null, 2);
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-FlappyPi-Entry": ENTRY_VERSION,
    ...extraHeaders
  });

  const origin = request.headers.get("Origin") || "";
  if ([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.81:3000",
    "https://192.168.1.81:3000",
    "https://qa.classic.flappypi.com",
    "https://classic.flappypi.com"
  ].includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }

  return new Response(text, { status, headers });
}

async function decorateShopResponse(response, startedAt, path) {
  const text = await response.text();
  const bytes = new TextEncoder().encode(text).byteLength;
  const elapsed = Date.now() - startedAt;
  const headers = new Headers(response.headers);

  /*
    Never force Content-Length here.

    Wrangler/Cloudflare owns HTTP framing and content encoding. A manually
    calculated uncompressed length can disagree with the bytes transferred
    after compression and leave browser fetches waiting even though the Worker
    already logged 200 OK.
  */
  headers.delete("Content-Length");
  headers.set("X-FlappyPi-Entry", ENTRY_VERSION);
  headers.set("X-FlappyPi-Route", "shop-catalog");
  headers.set("X-FlappyPi-Path", path);
  headers.set("X-FlappyPi-Response-Bytes", String(bytes));
  headers.set("X-FlappyPi-Elapsed-Ms", String(elapsed));

  console.log("[SHOP CATALOG RESPONSE]", {
    path,
    status: response.status,
    bytes,
    elapsed_ms: elapsed
  });

  return new Response(text, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const startedAt = Date.now();
    const url = new URL(request.url);
    const path = url.pathname;
    const requestId = crypto.randomUUID().slice(0, 8);

    console.log("[WORKER REQUEST]", {
      request_id: requestId,
      method: request.method,
      path,
      env: env?.ENV || null,
      entry: ENTRY_VERSION
    });

    if (path === "/__debug/runtime") {
      return diagnosticJson(request, {
        ok: true,
        request_id: requestId,
        entry: ENTRY_VERSION,
        env: env?.ENV || null,
        has_db: !!env?.DB,
        has_queue: !!env?.GAME_POINTS_QUEUE,
        has_r2: !!env?.GAME_PHOTOS,
        has_coingecko_demo_key: !!String(env?.COINGECKO_DEMO_API_KEY || "").trim(),
        url: request.url,
        now: Date.now()
      }, 200, {
        "X-FlappyPi-Route": "runtime-diagnostic"
      });
    }

    const shopResponse = await routeShopCatalog(request, env, url);
    if (shopResponse) {
      return decorateShopResponse(shopResponse, startedAt, path);
    }

    console.log("[WORKER DELEGATE]", {
      request_id: requestId,
      path,
      elapsed_ms: Date.now() - startedAt
    });

    return appWorker.fetch(request, env, ctx);
  },

  async queue(batch, env, ctx) {
    return appWorker.queue(batch, env, ctx);
  }
};
