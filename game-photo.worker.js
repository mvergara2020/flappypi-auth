import { registerGamePhoto, routePlatform } from "./platform.worker.js";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_COMMENT_CHARS = 100;
const PHOTO_CONTENT_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

const STAGE_STAR_GAMES = new Set(["flappy_classic", "webcam_flappy"]);
let stageStarSchemaPromise = null;
let photoSocialSchemaPromise = null;

function json(data, status, request, corsHeaders) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

function safeText(value, max = 80) { return String(value ?? "").trim().slice(0, max); }
function safeStage(value) { const stage = Number(value); return Number.isInteger(stage) && stage >= 0 && stage <= 99999 ? stage : 0; }
function safePoints(value) { const points = Number(value); return Number.isFinite(points) && points >= 0 ? Math.floor(points) : 0; }
function commentChars(value) { return Array.from(String(value ?? "").trim()); }
function safeComment(value) { return commentChars(value).slice(0, MAX_PHOTO_COMMENT_CHARS).join(""); }

async function ensurePhotoSocialSchema(env) {
  if (photoSocialSchemaPromise) return photoSocialSchemaPromise;
  photoSocialSchemaPromise = (async () => {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS game_photos (
        photo_id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL,
        game_type TEXT NOT NULL,
        stage INTEGER NOT NULL DEFAULT 0,
        total_points INTEGER NOT NULL DEFAULT 0,
        storage_key TEXT NOT NULL UNIQUE,
        content_type TEXT NOT NULL,
        comment TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        views INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0
      )
    `).run();

    try {
      await env.DB.prepare(`ALTER TABLE game_photos ADD COLUMN comment TEXT NOT NULL DEFAULT ''`).run();
    } catch (error) {
      const message = String(error?.message || error).toLowerCase();
      if (!message.includes("duplicate column") && !message.includes("already exists")) throw error;
    }

    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_game_photos_recent ON game_photos(created_at DESC)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_game_photos_game_recent ON game_photos(game_type,created_at DESC)`).run();
  })().catch(error => {
    photoSocialSchemaPromise = null;
    throw error;
  });
  return photoSocialSchemaPromise;
}

async function routePhotoFeed(request, env, helpers, url) {
  if (request.method !== "GET" || url.pathname !== "/game/photos") return null;
  const { requireUser, corsHeaders, normalizeGameId } = helpers;
  await ensurePhotoSocialSchema(env);

  let user = null;
  try { user = await requireUser(request, env); } catch (_) {}

  const requestedGame = String(url.searchParams.get("game_type") || "").trim();
  const gameType = requestedGame ? (normalizeGameId(requestedGame) || "") : "";
  const limit = Math.max(1, Math.min(30, Number(url.searchParams.get("limit") || 8)));

  const select = `
    SELECT p.photo_id,p.owner_user_id,p.game_type,p.stage,p.total_points,p.storage_key,p.comment,p.created_at,p.views,p.likes,
           u.user_name,u.name,
           EXISTS(SELECT 1 FROM game_photo_likes l WHERE l.photo_id=p.photo_id AND l.user_id=?) AS liked
    FROM game_photos p
    LEFT JOIN users u ON u.id=p.owner_user_id
  `;

  const rows = gameType
    ? await env.DB.prepare(`${select} WHERE p.game_type=? ORDER BY p.created_at DESC LIMIT ?`).bind(user?.id || "", gameType, limit).all()
    : await env.DB.prepare(`${select} ORDER BY p.created_at DESC LIMIT ?`).bind(user?.id || "", limit).all();

  return json({
    ok: true,
    scope: gameType ? "game" : "global",
    game_type: gameType || null,
    photos: (rows?.results || []).map(row => ({
      photo_id: row.photo_id,
      game_type: row.game_type,
      stage: Number(row.stage || 0),
      total_points: Number(row.total_points || 0),
      created_at: Number(row.created_at || 0),
      views: Number(row.views || 0),
      likes: Number(row.likes || 0),
      liked: Number(row.liked || 0) === 1,
      user_name: row.user_name,
      name: row.name,
      comment: safeComment(row.comment),
      storage_key: row.storage_key,
      url: `${url.origin}/game/photo/${String(row.storage_key).replace(/^shared\//, "")}`
    }))
  }, 200, request, corsHeaders);
}

/* Performance is based on server-observed attempts: 1 => 3★, 2-3 => 2★, 4+ => 1★. */
function getStagePerformance(attempts) {
  const count = Math.max(1, Number(attempts || 1));
  if (count === 1) return { stars: 3, performance: "EXCELLENT" };
  if (count <= 3) return { stars: 2, performance: "GOOD" };
  return { stars: 1, performance: "CLEARED" };
}

/* Lazy CREATE keeps local development zero-setup; move this table to D1 migrations before QA/prod. */
function ensureStageStarSchema(env) {
  if (stageStarSchemaPromise) return stageStarSchemaPromise;
  stageStarSchemaPromise = env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS game_stage_star_rewards (
      game_uid TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      level_id INTEGER NOT NULL,
      stars INTEGER NOT NULL,
      performance TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      applied_at INTEGER
    )
  `).run().catch(error => { stageStarSchemaPromise = null; throw error; });
  return stageStarSchemaPromise;
}

async function routeStageStars(request, env, helpers, url) {
  if (request.method !== "POST" || url.pathname !== "/game/stage-stars") return null;
  const { requireUser, corsHeaders, normalizeGameId } = helpers;
  const user = await requireUser(request, env);
  if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });

  let body = {};
  try { body = await request.json(); }
  catch (_) { return json({ ok: false, code: "INVALID_JSON" }, 400, request, corsHeaders); }

  const gameUid = safeText(body?.game_uid, 120);
  if (!gameUid) return json({ ok: false, code: "MISSING_GAME_UID" }, 400, request, corsHeaders);
  await ensureStageStarSchema(env);

  const existing = await env.DB.prepare(`
    SELECT stars, performance, attempts, level_id, game_type, applied_at
    FROM game_stage_star_rewards
    WHERE game_uid = ? AND user_id = ?
    LIMIT 1
  `).bind(gameUid, user.id).first();

  if (existing?.applied_at) {
    const totals = await env.DB.prepare(`SELECT COALESCE(total_score,0) AS total_score, COALESCE(tops_season_score,0) AS tops_season_score FROM users WHERE id = ?`).bind(user.id).first();
    return json({
      ok: true,
      game_uid: gameUid,
      game_type: existing.game_type,
      stage: Number(existing.level_id || 0),
      stars: Number(existing.stars || 0),
      performance: existing.performance || "CLEARED",
      attempts: Number(existing.attempts || 1),
      total_score: Number(totals?.total_score || 0),
      tops_season_score: Number(totals?.tops_season_score || 0),
      applied: true,
      duplicate: true
    }, 200, request, corsHeaders);
  }

  const gameRow = await env.DB.prepare(`
    SELECT game_uid, game_type, level_id, mode, created_at
    FROM games
    WHERE game_uid = ? AND user_id = ?
    LIMIT 1
  `).bind(gameUid, user.id).first();
  if (!gameRow) return json({ ok: false, code: "GAME_NOT_FOUND" }, 404, request, corsHeaders);

  const gameType = normalizeGameId(gameRow.game_type || "");
  const stage = Number(gameRow.level_id || 0);
  const mode = String(gameRow.mode || "");
  if (!STAGE_STAR_GAMES.has(gameType)) return json({ ok: false, code: "STAGE_STARS_NOT_ENABLED", game_type: gameType }, 409, request, corsHeaders);
  if (!Number.isInteger(stage) || stage < 1 || mode !== "levels") return json({ ok: false, code: "INVALID_STAGE_RESULT" }, 409, request, corsHeaders);

  const progress = await env.DB.prepare(`SELECT max_level_unlocked FROM user_game_progress WHERE user_id = ? AND game_type = ? LIMIT 1`).bind(user.id, gameType).first();
  const maxUnlocked = Number(progress?.max_level_unlocked || 1);
  const stageConfirmed = maxUnlocked > stage || (stage === 999 && maxUnlocked === 999);
  if (!stageConfirmed) return json({ ok: false, code: "STAGE_NOT_CONFIRMED", stage, max_level_unlocked: maxUnlocked }, 409, request, corsHeaders);

  const attemptsRow = await env.DB.prepare(`
    SELECT COUNT(*) AS attempts
    FROM games
    WHERE user_id = ? AND game_type = ? AND level_id = ? AND mode = 'levels' AND created_at <= ?
  `).bind(user.id, gameType, stage, Number(gameRow.created_at || Date.now())).first();

  const attempts = Math.max(1, Number(attemptsRow?.attempts || 1));
  const rating = getStagePerformance(attempts);
  const now = Date.now();

  await env.DB.prepare(`
    INSERT OR IGNORE INTO game_stage_star_rewards (
      game_uid,user_id,game_type,level_id,stars,performance,attempts,created_at,applied_at
    ) VALUES (?,?,?,?,?,?,?,?,NULL)
  `).bind(gameUid, user.id, gameType, stage, rating.stars, rating.performance, attempts, now).run();

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE users
      SET
        total_score = COALESCE(total_score,0) + (SELECT stars FROM game_stage_star_rewards WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL),
        tops_season_score = COALESCE(tops_season_score,0) + (SELECT stars FROM game_stage_star_rewards WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL)
      WHERE id = ?
        AND EXISTS (SELECT 1 FROM game_stage_star_rewards WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL)
    `).bind(gameUid, user.id, gameUid, user.id, user.id, gameUid, user.id),
    env.DB.prepare(`UPDATE game_stage_star_rewards SET applied_at = ? WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL`).bind(now, gameUid, user.id)
  ]);

  const [reward, totals] = await Promise.all([
    env.DB.prepare(`SELECT stars,performance,attempts,level_id,game_type,applied_at FROM game_stage_star_rewards WHERE game_uid = ? AND user_id = ? LIMIT 1`).bind(gameUid, user.id).first(),
    env.DB.prepare(`SELECT COALESCE(total_score,0) AS total_score, COALESCE(tops_season_score,0) AS tops_season_score FROM users WHERE id = ?`).bind(user.id).first()
  ]);

  return json({
    ok: true,
    game_uid: gameUid,
    game_type: reward?.game_type || gameType,
    stage: Number(reward?.level_id || stage),
    stars: Number(reward?.stars || rating.stars),
    performance: reward?.performance || rating.performance,
    attempts: Number(reward?.attempts || attempts),
    total_score: Number(totals?.total_score || 0),
    tops_season_score: Number(totals?.tops_season_score || 0),
    applied: Number(reward?.applied_at || 0) > 0,
    duplicate: false
  }, 200, request, corsHeaders);
}

export async function routeGamePhoto(request, env, helpers = {}) {
  const url = new URL(request.url);
  const corsHeaders = helpers.corsHeaders;
  const requireUser = helpers.requireUser;
  const normalizeGameId = helpers.normalizeGameId || (value => safeText(value, 64));
  if (typeof corsHeaders !== "function" || typeof requireUser !== "function") return null;

  const feedResponse = await routePhotoFeed(request, env, { requireUser, corsHeaders, normalizeGameId }, url);
  if (feedResponse) return feedResponse;

  /*
    Platform features piggyback on the already installed Worker router hook.
    This avoids touching the large worker.js for every new feature module.
  */
  const platformResponse = await routePlatform(request, env, { requireUser, corsHeaders, normalizeGameId });
  if (platformResponse) return platformResponse;

  const stageStarsResponse = await routeStageStars(request, env, { requireUser, corsHeaders, normalizeGameId }, url);
  if (stageStarsResponse) return stageStarsResponse;

  if (request.method === "POST" && url.pathname === "/game/photo") {
    const user = await requireUser(request, env);
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
    if (!env.GAME_PHOTOS || typeof env.GAME_PHOTOS.put !== "function") return json({ ok: false, code: "PHOTO_STORAGE_NOT_CONFIGURED" }, 503, request, corsHeaders);

    const rawComment = String(url.searchParams.get("comment") || "").trim();
    if (commentChars(rawComment).length > MAX_PHOTO_COMMENT_CHARS) {
      return json({ ok: false, code: "PHOTO_COMMENT_TOO_LONG", max_chars: MAX_PHOTO_COMMENT_CHARS }, 400, request, corsHeaders);
    }
    const comment = safeComment(rawComment);

    const contentType = String(request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
    const ext = PHOTO_CONTENT_TYPES.get(contentType);
    if (!ext) return json({ ok: false, code: "PHOTO_TYPE_NOT_ALLOWED" }, 415, request, corsHeaders);

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_PHOTO_BYTES) return json({ ok: false, code: "PHOTO_TOO_LARGE", max_bytes: MAX_PHOTO_BYTES }, 413, request, corsHeaders);
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_PHOTO_BYTES) return json({ ok: false, code: "PHOTO_TOO_LARGE", max_bytes: MAX_PHOTO_BYTES }, 413, request, corsHeaders);

    const photoId = crypto.randomUUID();
    const fileName = `${photoId}.${ext}`;
    const key = `shared/${fileName}`;
    const gameType = normalizeGameId(url.searchParams.get("game_type") || "game") || "game";
    const stage = safeStage(url.searchParams.get("stage"));
    const totalPoints = safePoints(url.searchParams.get("total_points"));
    const createdAt = Date.now();

    await env.GAME_PHOTOS.put(key, bytes, {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { owner_user_id: safeText(user.id,120), game_type: safeText(gameType,64), stage: String(stage), total_points: String(totalPoints), created_at: String(createdAt) }
    });

    try {
      await ensurePhotoSocialSchema(env);
      await registerGamePhoto(env, {
        photo_id: photoId,
        owner_user_id: user.id,
        game_type: gameType,
        stage,
        total_points: totalPoints,
        storage_key: key,
        content_type: contentType,
        created_at: createdAt
      });
      await env.DB.prepare(`UPDATE game_photos SET comment=? WHERE photo_id=?`).bind(comment, photoId).run();
    } catch (error) {
      try { await env.GAME_PHOTOS.delete(key); } catch (_) {}
      console.error("[GAME PHOTO INDEX ERROR]", error);
      return json({ ok: false, code: "PHOTO_INDEX_FAILED" }, 500, request, corsHeaders);
    }

    return json({ ok: true, photo_id: photoId, content_type: contentType, size: bytes.byteLength, storage_key: key, comment, url: `${url.origin}/game/photo/${fileName}` }, 201, request, corsHeaders);
  }

  const photoMatch = url.pathname.match(/^\/game\/photo\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i);
  if ((request.method === "GET" || request.method === "HEAD") && photoMatch) {
    if (!env.GAME_PHOTOS || typeof env.GAME_PHOTOS.get !== "function") return new Response("Photo storage unavailable", { status: 503, headers: corsHeaders(request) });
    const object = await env.GAME_PHOTOS.get(`shared/${photoMatch[1].toLowerCase()}`);
    if (!object) return new Response("Not Found", { status: 404, headers: corsHeaders(request) });
    const headers = new Headers(corsHeaders(request));
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
  }

  return null;
}
