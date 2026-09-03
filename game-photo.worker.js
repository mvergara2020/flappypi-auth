import { registerGamePhoto, routePlatform } from "./platform.worker.js";
import { routeSponsors } from "./sponsor.worker.js";
import { routePhotoView } from "./photo-views.worker.js";
import { enqueueTelegramPhoto } from "./telegram-photo.worker.js";
import {
  buildGameImageKey,
  deleteStoredImage,
  getStoredImage,
  imageContentTypeForExtension,
  imageExtensionForContentType,
  imageMatchesSignature,
  MAX_IMAGE_BYTES,
  putStoredImage
} from "./media-storage.worker.js";

const MAX_PHOTO_BYTES = MAX_IMAGE_BYTES;
const MAX_PHOTO_COMMENT_CHARS = 100;
const PHOTO_CONTENT_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

// Retro usa el mismo flujo de niveles que Classic y debe poder reclamar
// las estrellas al completar una etapa.
const STAGE_STAR_GAMES = new Set(["flappy_classic", "flappy_retro", "webcam_flappy"]);
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

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS game_photo_likes (
        photo_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (photo_id,user_id)
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
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_game_photos_owner_recent ON game_photos(owner_user_id,created_at DESC)`).run();
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

  const scope = String(url.searchParams.get("scope") || "").trim().toLowerCase();
  if (scope === "mine" && !user) {
    return json({ ok: false, code: "AUTH_REQUIRED" }, 401, request, corsHeaders);
  }

  const requestedGame = String(url.searchParams.get("game_type") || "").trim();
  const gameType = requestedGame ? (normalizeGameId(requestedGame) || "") : "";
  const limit = Math.max(1, Math.min(30, Number(url.searchParams.get("limit") || 8)));
  const page = Math.max(1, Math.min(10000, Math.floor(Number(url.searchParams.get("page") || 1))));
  const offset = (page - 1) * limit;
  const wantsPagination = scope === "mine" || url.searchParams.has("page");
  const filters = [];
  const filterValues = [];

  if (scope === "mine") {
    filters.push("p.owner_user_id=?");
    filterValues.push(user.id);
  }
  if (gameType) {
    filters.push("p.game_type=?");
    filterValues.push(gameType);
  }
  const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";

  const select = `
    SELECT p.photo_id,p.owner_user_id,p.game_type,p.stage,p.total_points,p.storage_key,p.content_type,p.comment,p.created_at,p.views,p.likes,
           u.user_name,u.name,
           EXISTS(SELECT 1 FROM game_photo_likes l WHERE l.photo_id=p.photo_id AND l.user_id=?) AS liked
    FROM game_photos p
    LEFT JOIN users u ON u.id=p.owner_user_id
  `;

  const [rows, countRow] = await Promise.all([
    env.DB.prepare(`${select}${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`)
      .bind(user?.id || "", ...filterValues, limit, offset).all(),
    wantsPagination
      ? env.DB.prepare(`SELECT COUNT(*) AS total FROM game_photos p${where}`).bind(...filterValues).first()
      : Promise.resolve(null)
  ]);
  const total = countRow ? Number(countRow.total || 0) : Number(rows?.results?.length || 0);
  const pages = Math.max(1, Math.ceil(total / limit));

  return json({
    ok: true,
    scope: scope === "mine" ? "mine" : gameType ? "game" : "global",
    game_type: gameType || null,
    pagination: {
      page,
      limit,
      total,
      pages,
      has_previous: page > 1,
      has_next: page < pages
    },
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
      url: `${url.origin}/game/photo/${row.photo_id}.${imageExtensionForContentType(row.content_type) || "jpg"}`
    }))
  }, 200, request, corsHeaders);
}

function getStagePerformance(attempts) {
  const count = Math.max(1, Number(attempts || 1));
  if (count === 1) return { stars: 3, performance: "EXCELLENT" };
  if (count <= 3) return { stars: 2, performance: "GOOD" };
  return { stars: 1, performance: "CLEARED" };
}

function activeStageBoostMultiplier(user, now = Date.now()) {
  const multiplier = Number(user?.boost_multiplier || user?.active_boost?.multiplier || 0);
  const expiresAt = Number(user?.boost_expires_at || user?.active_boost?.expires_at || 0);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return 1;
  return [3, 5, 8].includes(multiplier) ? multiplier : 1;
}

function stageRewardPayload(storedStars, attempts) {
  const ratingStars = getStagePerformance(attempts).stars;
  const awardedStars = Math.max(ratingStars, Number(storedStars || ratingStars));
  const inferredMultiplier = awardedStars / ratingStars;
  return {
    stars: ratingStars,
    rating_stars: ratingStars,
    stars_awarded: awardedStars,
    boost_multiplier: [3, 5, 8].includes(inferredMultiplier) ? inferredMultiplier : 1
  };
}

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
    const rewardMeta = stageRewardPayload(existing.stars, existing.attempts);
    return json({
      ok: true,
      game_uid: gameUid,
      game_type: existing.game_type,
      stage: Number(existing.level_id || 0),
      ...rewardMeta,
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
  const boostMultiplier = activeStageBoostMultiplier(user, now);
  const awardedStars = rating.stars * boostMultiplier;

  await env.DB.prepare(`
    INSERT OR IGNORE INTO game_stage_star_rewards (
      game_uid,user_id,game_type,level_id,stars,performance,attempts,created_at,applied_at
    ) VALUES (?,?,?,?,?,?,?,?,NULL)
  `).bind(gameUid, user.id, gameType, stage, awardedStars, rating.performance, attempts, now).run();

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
    ...stageRewardPayload(reward?.stars || awardedStars, reward?.attempts || attempts),
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

  const sponsorResponse = await routeSponsors(request, env, { requireUser, corsHeaders, normalizeGameId });
  if (sponsorResponse) return sponsorResponse;

  const feedResponse = await routePhotoFeed(request, env, { requireUser, corsHeaders, normalizeGameId }, url);
  if (feedResponse) return feedResponse;

  const viewResponse = await routePhotoView(request, env, { corsHeaders });
  if (viewResponse) return viewResponse;

  const platformResponse = await routePlatform(request, env, { requireUser, corsHeaders, normalizeGameId });
  if (platformResponse) return platformResponse;

  const stageStarsResponse = await routeStageStars(request, env, { requireUser, corsHeaders, normalizeGameId }, url);
  if (stageStarsResponse) return stageStarsResponse;

  if (request.method === "POST" && url.pathname === "/game/photo") {
    const user = await requireUser(request, env);
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
    if (!env.IMAGES_BUCKET || typeof env.IMAGES_BUCKET.put !== "function") return json({ ok: false, code: "PHOTO_STORAGE_NOT_CONFIGURED" }, 503, request, corsHeaders);

    const rawComment = String(url.searchParams.get("comment") || "").trim();
    if (commentChars(rawComment).length > MAX_PHOTO_COMMENT_CHARS) {
      return json({ ok: false, code: "PHOTO_COMMENT_TOO_LONG", max_chars: MAX_PHOTO_COMMENT_CHARS }, 400, request, corsHeaders);
    }
    const comment = safeComment(rawComment);

    const contentType = String(request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
    const ext = imageExtensionForContentType(contentType) || PHOTO_CONTENT_TYPES.get(contentType);
    if (!ext) return json({ ok: false, code: "PHOTO_TYPE_NOT_ALLOWED" }, 415, request, corsHeaders);

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_PHOTO_BYTES) return json({ ok: false, code: "PHOTO_TOO_LARGE", max_bytes: MAX_PHOTO_BYTES }, 413, request, corsHeaders);
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_PHOTO_BYTES) return json({ ok: false, code: "PHOTO_TOO_LARGE", max_bytes: MAX_PHOTO_BYTES }, 413, request, corsHeaders);
    if (!imageMatchesSignature(bytes, contentType)) return json({ ok: false, code: "PHOTO_SIGNATURE_INVALID" }, 415, request, corsHeaders);

    const photoId = crypto.randomUUID();
    const fileName = `${photoId}.${ext}`;
    const gameType = normalizeGameId(url.searchParams.get("game_type") || "game") || "game";
    const stage = safeStage(url.searchParams.get("stage"));
    const totalPoints = safePoints(url.searchParams.get("total_points"));
    const createdAt = Date.now();
    const key = buildGameImageKey(env, { gameType, userId: user.id, photoId, extension: ext, createdAt });

    try {
      await putStoredImage(env, key, bytes, contentType, { owner_user_id: safeText(user.id,120), game_type: safeText(gameType,64), stage: String(stage), total_points: String(totalPoints), created_at: String(createdAt) });
    } catch (error) {
      console.error("[GAME PHOTO STORAGE ERROR]", { code: String(error?.message || error) });
      return json({ ok: false, code: "PHOTO_STORAGE_NOT_CONFIGURED" }, 503, request, corsHeaders);
    }

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
      try { await deleteStoredImage(env, key); } catch (cleanupError) { console.error("[GAME PHOTO CLEANUP ERROR]", { code: String(cleanupError?.message || cleanupError) }); }
      console.error("[GAME PHOTO INDEX ERROR]", error);
      return json({ ok: false, code: "PHOTO_INDEX_FAILED" }, 500, request, corsHeaders);
    }

    let telegram = { environment: "localhost", enabled: false, status: "not_scheduled" };
    try {
      telegram = await enqueueTelegramPhoto(env, { photoId }, request.url);
    } catch (error) {
      console.error("[TELEGRAM PHOTO SCHEDULE ERROR]", {
        photo_id: photoId,
        message: String(error?.message || error)
      });
      telegram = {
        environment: String(env?.PHOTO_TELEGRAM_ENV || env?.ENV || "localhost"),
        enabled: true,
        status: "schedule_failed"
      };
    }

    return json({
      ok: true,
      photo_id: photoId,
      content_type: contentType,
      size: bytes.byteLength,
      comment,
      url: `${url.origin}/game/photo/${fileName}`,
      telegram
    }, 201, request, corsHeaders);
  }

  const photoMatch = url.pathname.match(/^\/game\/photo\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i);
  if ((request.method === "GET" || request.method === "HEAD") && photoMatch) {
    const [photoId, extension] = photoMatch[1].toLowerCase().split(".");
    const row = await env.DB.prepare(`SELECT storage_key,content_type FROM game_photos WHERE photo_id=? LIMIT 1`).bind(photoId).first();
    const legacyKey = `shared/${photoMatch[1].toLowerCase()}`;
    const object = row?.storage_key
      ? await getStoredImage(env, row.storage_key)
      : await getStoredImage(env, legacyKey);
    if (!object) return new Response("Not Found", { status: 404, headers: corsHeaders(request) });
    const headers = new Headers(corsHeaders(request));
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Content-Type", row?.content_type || imageContentTypeForExtension(extension) || "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
  }

  if (request.method === "DELETE" && photoMatch) {
    const user = await requireUser(request, env);
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
    const photoId = photoMatch[1].split(".", 1)[0].toLowerCase();
    const row = await env.DB.prepare(`SELECT owner_user_id,storage_key FROM game_photos WHERE photo_id=? LIMIT 1`).bind(photoId).first();
    if (!row) return json({ ok: false, code: "PHOTO_NOT_FOUND" }, 404, request, corsHeaders);
    if (String(row.owner_user_id) !== String(user.id)) return json({ ok: false, code: "PHOTO_FORBIDDEN" }, 403, request, corsHeaders);
    try {
      await deleteStoredImage(env, row.storage_key);
      await env.DB.batch([
        env.DB.prepare(`DELETE FROM game_photo_likes WHERE photo_id=?`).bind(photoId),
        env.DB.prepare(`DELETE FROM game_photo_telegram_deliveries WHERE photo_id=?`).bind(photoId),
        env.DB.prepare(`DELETE FROM game_photos WHERE photo_id=?`).bind(photoId)
      ]);
    } catch (error) {
      console.error("[GAME PHOTO DELETE ERROR]", { photo_id: photoId, code: String(error?.message || error) });
      return json({ ok: false, code: "PHOTO_DELETE_FAILED" }, 500, request, corsHeaders);
    }
    return json({ ok: true, photo_id: photoId }, 200, request, corsHeaders);
  }

  return null;
}
