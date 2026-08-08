const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_CONTENT_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

function json(data, status, request, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function safeText(value, max = 80) {
  return String(value ?? "").trim().slice(0, max);
}

function safeStage(value) {
  const stage = Number(value);
  return Number.isInteger(stage) && stage >= 0 && stage <= 99999 ? stage : 0;
}

function safePoints(value) {
  const points = Number(value);
  return Number.isFinite(points) && points >= 0 ? Math.floor(points) : 0;
}

export async function routeGamePhoto(request, env, helpers = {}) {
  const url = new URL(request.url);
  const corsHeaders = helpers.corsHeaders;
  const requireUser = helpers.requireUser;
  const normalizeGameId = helpers.normalizeGameId || (value => safeText(value, 64));

  if (typeof corsHeaders !== "function" || typeof requireUser !== "function") return null;

  if (request.method === "POST" && url.pathname === "/game/photo") {
    const user = await requireUser(request, env);
    if (!user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
    }

    if (!env.GAME_PHOTOS || typeof env.GAME_PHOTOS.put !== "function") {
      return json({ ok: false, code: "PHOTO_STORAGE_NOT_CONFIGURED" }, 503, request, corsHeaders);
    }

    const contentType = String(request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
    const ext = PHOTO_CONTENT_TYPES.get(contentType);
    if (!ext) {
      return json({ ok: false, code: "PHOTO_TYPE_NOT_ALLOWED" }, 415, request, corsHeaders);
    }

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_PHOTO_BYTES) {
      return json({ ok: false, code: "PHOTO_TOO_LARGE", max_bytes: MAX_PHOTO_BYTES }, 413, request, corsHeaders);
    }

    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_PHOTO_BYTES) {
      return json({ ok: false, code: "PHOTO_TOO_LARGE", max_bytes: MAX_PHOTO_BYTES }, 413, request, corsHeaders);
    }

    const photoId = crypto.randomUUID();
    const fileName = `${photoId}.${ext}`;
    const key = `shared/${fileName}`;
    const gameType = normalizeGameId(url.searchParams.get("game_type") || "game") || "game";
    const stage = safeStage(url.searchParams.get("stage"));
    const totalPoints = safePoints(url.searchParams.get("total_points"));
    const createdAt = Date.now();

    await env.GAME_PHOTOS.put(key, bytes, {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=31536000, immutable"
      },
      customMetadata: {
        owner_user_id: safeText(user.id, 120),
        game_type: safeText(gameType, 64),
        stage: String(stage),
        total_points: String(totalPoints),
        created_at: String(createdAt)
      }
    });

    return json({
      ok: true,
      photo_id: photoId,
      content_type: contentType,
      size: bytes.byteLength,
      url: `${url.origin}/game/photo/${fileName}`
    }, 201, request, corsHeaders);
  }

  const photoMatch = url.pathname.match(/^\/game\/photo\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i);
  if ((request.method === "GET" || request.method === "HEAD") && photoMatch) {
    if (!env.GAME_PHOTOS || typeof env.GAME_PHOTOS.get !== "function") {
      return new Response("Photo storage unavailable", { status: 503, headers: corsHeaders(request) });
    }

    const object = await env.GAME_PHOTOS.get(`shared/${photoMatch[1].toLowerCase()}`);
    if (!object) return new Response("Not Found", { status: 404, headers: corsHeaders(request) });

    const headers = new Headers(corsHeaders(request));
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(request.method === "HEAD" ? null : object.body, {
      status: 200,
      headers
    });
  }

  return null;
}
