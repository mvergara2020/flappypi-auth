const DAY_MS = 24 * 60 * 60 * 1000;
let schemaPromise = null;

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

function clientIp(request) {
  const cf = String(request.headers.get("CF-Connecting-IP") || "").trim();
  if (cf) return cf;

  const forwarded = String(request.headers.get("X-Forwarded-For") || "")
    .split(",")[0]
    .trim();
  if (forwarded) return forwarded;

  const real = String(request.headers.get("X-Real-IP") || "").trim();
  if (real) return real;

  return "local:" + String(request.headers.get("User-Agent") || "unknown").slice(0, 180);
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function viewerHash(request, env) {
  const secret = String(
    env?.PHOTO_VIEW_HASH_SECRET ||
    env?.JWT_SECRET ||
    "flappypi-local-photo-view-v1"
  );

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(clientIp(request))
  );

  return bytesToHex(signature);
}

async function ensureSchema(env) {
  if (schemaPromise) return schemaPromise;

  schemaPromise = env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS game_photo_views_daily (
        photo_id TEXT NOT NULL,
        viewer_hash TEXT NOT NULL,
        view_day INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (photo_id,viewer_hash,view_day)
      )
    `),
    env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_game_photo_views_daily_day
      ON game_photo_views_daily(view_day)
    `)
  ]).catch(error => {
    schemaPromise = null;
    throw error;
  });

  return schemaPromise;
}

export async function routePhotoView(request, env, helpers = {}) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/game\/photo\/([0-9a-f-]{36})\/view$/i);
  if (!match || request.method !== "POST") return null;
  if (typeof helpers.corsHeaders !== "function") return null;

  await ensureSchema(env);

  const photoId = match[1].toLowerCase();
  const current = await env.DB.prepare(`
    SELECT views,likes
    FROM game_photos
    WHERE photo_id=?
    LIMIT 1
  `).bind(photoId).first();

  if (!current) {
    return json({ ok:false, code:"PHOTO_NOT_FOUND" }, 404, request, helpers.corsHeaders);
  }

  const day = Math.floor(Date.now() / DAY_MS);
  const hash = await viewerHash(request, env);
  const inserted = await env.DB.prepare(`
    INSERT OR IGNORE INTO game_photo_views_daily (
      photo_id,viewer_hash,view_day,created_at
    ) VALUES (?,?,?,?)
  `).bind(photoId, hash, day, Date.now()).run();

  const counted = Number(inserted?.meta?.changes || 0) === 1;

  if (counted) {
    await env.DB.prepare(`
      UPDATE game_photos
      SET views=views+1
      WHERE photo_id=?
    `).bind(photoId).run();
  }

  const row = await env.DB.prepare(`
    SELECT views,likes
    FROM game_photos
    WHERE photo_id=?
    LIMIT 1
  `).bind(photoId).first();

  return json({
    ok:true,
    counted,
    dedupe:"ip_hash_per_utc_day",
    views:Number(row?.views || 0),
    likes:Number(row?.likes || 0)
  }, 200, request, helpers.corsHeaders);
}
