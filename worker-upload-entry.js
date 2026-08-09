import baseWorker from "./worker-fast-entry.js";

const MAX_SHARED_IMAGE_BYTES = 300 * 1024;

function isSharedImageUpload(request) {
  if (request.method !== "POST") return false;
  const path = new URL(request.url).pathname;
  return path === "/game/photo" || path === "/sponsors";
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };
}

function tooLarge(request, actualBytes = null) {
  return new Response(JSON.stringify({
    ok: false,
    code: "IMAGE_UPLOAD_TOO_LARGE",
    max_bytes: MAX_SHARED_IMAGE_BYTES,
    max_kb: 300,
    actual_bytes: actualBytes
  }), {
    status: 413,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
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

async function handleFetch(request, env, ctx) {
  if (isSharedImageUpload(request)) {
    const size = await bodyExceedsLimit(request, MAX_SHARED_IMAGE_BYTES);
    if (size.exceeds) return tooLarge(request, size.bytes);
  }

  return baseWorker.fetch(request, env, ctx);
}

export default {
  fetch: handleFetch,
  async queue(batch, env, ctx) {
    return baseWorker.queue(batch, env, ctx);
  }
};
