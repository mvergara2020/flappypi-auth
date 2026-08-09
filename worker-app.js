import coreWorker from "./worker-entry.js";
import { routeInternalAds } from "./ads-internal.worker.js";
import { prepareSingleAdRevive, releaseSingleAdReservation } from "./ads-single-revive.worker.js";
import { ensureAllGameProgress, routeGameStageProgress } from "./game-stage-progress.worker.js";

const EXTRA_ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.81:3000",
  "https://192.168.1.81:3000",
  "https://qa.classic.flappypi.com",
  "https://classic.flappypi.com"
]);

const SUPPORTED_LANGUAGES = new Set([
  "en", "es", "zh-CN", "zh-TW", "ko", "vi", "id",
  "hi", "pt-BR", "fr", "tr", "ar", "fil"
]);

let languageSchemaPromise = null;

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

function json(request, body, status = 200) {
  return withCors(request, new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  }));
}

function normalizedEnv(env) {
  if (env.PI_API_KEY || !env.PI_SERVER_API_KEY) return env;

  return new Proxy(env, {
    get(target, property, receiver) {
      if (property === "PI_API_KEY") return target.PI_SERVER_API_KEY;
      return Reflect.get(target, property, receiver);
    }
  });
}

function rewriteAlias(request) {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/shop/catalog") {
    url.pathname = "/shop/flappycoin/catalog";
    return new Request(url.toString(), request);
  }

  return request;
}

function ensureLanguageSchema(env) {
  if (languageSchemaPromise) return languageSchemaPromise;

  languageSchemaPromise = env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS user_language_preferences (
      user_id TEXT PRIMARY KEY,
      language TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run().catch(error => {
    languageSchemaPromise = null;
    throw error;
  });

  return languageSchemaPromise;
}

function normalizeLanguage(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase() === "auto") return null;

  const normalized = raw.replace(/_/g, "-");
  const lower = normalized.toLowerCase();

  if (lower === "zh" || lower === "zh-cn" || lower === "zh-hans" || lower.startsWith("zh-hans-")) return "zh-CN";
  if (lower === "zh-tw" || lower === "zh-hk" || lower === "zh-hant" || lower.startsWith("zh-hant-")) return "zh-TW";
  if (lower === "pt" || lower === "pt-br" || lower.startsWith("pt-br-")) return "pt-BR";
  if (lower === "fil" || lower === "tl" || lower.startsWith("fil-") || lower.startsWith("tl-")) return "fil";

  const base = lower.split("-")[0];
  const simple = ["en", "es", "ko", "vi", "id", "hi", "fr", "tr", "ar"];
  if (simple.includes(base)) return base;

  return null;
}

async function getCoreUser(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = "/me";
  url.search = "?lvl_loaded=1";

  const meRequest = new Request(url.toString(), {
    method: "GET",
    headers: request.headers
  });

  const response = await coreWorker.fetch(meRequest, env, ctx);
  if (!response.ok) return null;
  return await response.json().catch(() => null);
}

async function getSavedLanguage(env, userId) {
  if (!userId) return null;
  await ensureLanguageSchema(env);

  const row = await env.DB.prepare(`
    SELECT language
    FROM user_language_preferences
    WHERE user_id = ?
    LIMIT 1
  `).bind(String(userId)).first();

  return SUPPORTED_LANGUAGES.has(String(row?.language || "")) ? String(row.language) : null;
}

async function saveLanguage(env, userId, language) {
  await ensureLanguageSchema(env);

  if (!language) {
    await env.DB.prepare(`
      DELETE FROM user_language_preferences
      WHERE user_id = ?
    `).bind(String(userId)).run();
    return null;
  }

  if (!SUPPORTED_LANGUAGES.has(language)) throw new Error("UNSUPPORTED_LANGUAGE");

  await env.DB.prepare(`
    INSERT INTO user_language_preferences (user_id, language, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      language = excluded.language,
      updated_at = excluded.updated_at
  `).bind(String(userId), language, Date.now()).run();

  return language;
}

async function routeLanguagePreference(request, env, ctx, url) {
  if (url.pathname !== "/profile/language") return null;
  if (request.method !== "GET" && request.method !== "POST") return null;

  const user = await getCoreUser(request, env, ctx);
  if (!user?.id) return json(request, { ok: false, code: "UNAUTHORIZED" }, 401);

  if (request.method === "GET") {
    const language = await getSavedLanguage(env, user.id);
    return json(request, {
      ok: true,
      language,
      source: language ? "profile" : "browser",
      supported: [...SUPPORTED_LANGUAGES]
    });
  }

  let body = {};
  try { body = await request.json(); }
  catch (_) { return json(request, { ok: false, code: "INVALID_JSON" }, 400); }

  const requested = body?.language;
  const language = normalizeLanguage(requested);

  if (
    requested != null &&
    String(requested).trim() !== "" &&
    String(requested).trim().toLowerCase() !== "auto" &&
    !language
  ) {
    return json(request, { ok: false, code: "UNSUPPORTED_LANGUAGE" }, 400);
  }

  await saveLanguage(env, user.id, language);

  return json(request, {
    ok: true,
    language,
    source: language ? "profile" : "browser"
  });
}

async function enrichMeResponse(request, env, response) {
  if (!response.ok) return response;

  let data;
  try { data = await response.clone().json(); }
  catch (_) { return response; }

  if (!data?.id) return response;

  const [language, gameProgress] = await Promise.all([
    getSavedLanguage(env, data.id),
    ensureAllGameProgress(env, data.id)
  ]);

  data.language = language;
  data.language_source = language ? "profile" : "browser";
  data.supported_languages = [...SUPPORTED_LANGUAGES];
  data.game_progress = {
    ...(data.game_progress && typeof data.game_progress === "object" ? data.game_progress : {}),
    ...gameProgress
  };

  const headers = new Headers(response.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  return new Response(JSON.stringify(data), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function maybePersistLanguageFromProfileUpdate(request, env, ctx, url) {
  if (request.method !== "POST" || url.pathname !== "/profile/update") return;

  let body;
  try { body = await request.clone().json(); }
  catch (_) { return; }

  if (!Object.prototype.hasOwnProperty.call(body || {}, "language")) return;

  const user = await getCoreUser(request, env, ctx);
  if (!user?.id) return;

  const requested = body.language;
  const language = normalizeLanguage(requested);
  if (requested && String(requested).toLowerCase() !== "auto" && !language) return;
  await saveLanguage(env, user.id, language);
}

async function routeSharedGameStage(request, env, ctx, url) {
  if (
    request.method !== "POST" ||
    (url.pathname !== "/game/stage/start" && url.pathname !== "/game/stage/finish")
  ) return null;

  const user = await getCoreUser(request, env, ctx);
  const response = await routeGameStageProgress(request, env, user);
  return response ? withCors(request, response) : null;
}

async function getSeasonState(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = "/season/status";
  url.search = "";

  const statusRequest = new Request(url.toString(), {
    method: "GET",
    headers: request.headers
  });

  const response = await coreWorker.fetch(statusRequest, env, ctx);
  const data = await response.clone().json().catch(() => null);

  return {
    ok: response.ok && data?.ok !== false,
    state: String(data?.season?.state || ""),
    season_id: data?.season?.id || null,
    next_season: data?.season?.next_season || null
  };
}

async function rewriteFingerTerminalResponse(request, response) {
  if (!response.ok) return response;

  let data;
  try { data = await response.clone().json(); }
  catch (_) { return response; }

  if (
    data?.ok === true &&
    data?.game_type === "finger_trace" &&
    data?.level?.completed === true &&
    Number(data?.level?.completed_level || 0) === 999 &&
    Number(data?.level?.max_level_unlocked || 0) === 999 &&
    data?.level?.next_level == null
  ) {
    data.level.advanced = true;
    data.level.terminal = true;

    return withCors(request, new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    }));
  }

  return response;
}

export default {
  async fetch(request, env, ctx) {
    const runtimeEnv = normalizedEnv(env);
    const sourceUrl = new URL(request.url);

    const adPolicy = await prepareSingleAdRevive(request, runtimeEnv, sourceUrl);
    if (adPolicy?.response) return withCors(request, adPolicy.response);

    const adResponse = await routeInternalAds(request, runtimeEnv, sourceUrl);
    if (adResponse) {
      if (adPolicy?.reservation && !adResponse.ok) {
        await releaseSingleAdReservation(runtimeEnv, adPolicy.reservation);
      }
      return withCors(request, adResponse);
    }

    if (adPolicy?.reservation) {
      await releaseSingleAdReservation(runtimeEnv, adPolicy.reservation);
    }

    const stageResponse = await routeSharedGameStage(request, runtimeEnv, ctx, sourceUrl);
    if (stageResponse) return stageResponse;

    const languageResponse = await routeLanguagePreference(request, runtimeEnv, ctx, sourceUrl);
    if (languageResponse) return languageResponse;

    await maybePersistLanguageFromProfileUpdate(request, runtimeEnv, ctx, sourceUrl);

    if (
      request.method === "POST" &&
      sourceUrl.pathname === "/season/pass/pi-create"
    ) {
      const season = await getSeasonState(request, runtimeEnv, ctx);

      if (
        season.ok &&
        (season.state === "intermission" || season.state === "ended")
      ) {
        return json(request, {
          ok: false,
          code: "SEASON_PASS_NOT_ON_SALE",
          state: season.state,
          season_id: season.season_id,
          next_season: season.next_season
        }, 409);
      }
    }

    const routedRequest = rewriteAlias(request);
    let response = await coreWorker.fetch(routedRequest, runtimeEnv, ctx);

    if (request.method === "GET" && sourceUrl.pathname === "/me") {
      response = await enrichMeResponse(request, runtimeEnv, response);
    }

    if (
      request.method === "POST" &&
      sourceUrl.pathname === "/game/finish"
    ) {
      response = await rewriteFingerTerminalResponse(request, response);
    }

    return withCors(request, response);
  },

  async queue(batch, env, ctx) {
    return coreWorker.queue(batch, normalizedEnv(env), ctx);
  }
};
