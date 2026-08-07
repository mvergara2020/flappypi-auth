var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-TJtHKa/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// worker.js
var FRONTEND_ORIGIN = "http://localhost:3000";
var FREE_EGG_COOLDOWN = 8 * 60 * 60 * 1e3;
function cacheKey(path) {
  return new Request(`https://cache.flappypi/${path}`);
}
__name(cacheKey, "cacheKey");
async function generateUniqueUsername(env, googleSub) {
  for (let i = 0; i < 5; i++) {
    const candidate = generateUsername(googleSub, i);
    const exists = await env.DB.prepare(
      "SELECT 1 FROM users WHERE user_name = ? LIMIT 1"
    ).bind(candidate).first();
    if (!exists) {
      return candidate;
    }
  }
  return `user_${googleSub.slice(-8)}`;
}
__name(generateUniqueUsername, "generateUniqueUsername");
function randomDigits(length = 10) {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => n % 10).join("");
}
__name(randomDigits, "randomDigits");
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  };
}
__name(corsHeaders, "corsHeaders");
function generateUsername() {
  const prefix = "flappypi";
  const digits = randomDigits(10);
  return `${prefix}_${digits}`;
}
__name(generateUsername, "generateUsername");
function base64url(input) {
  return btoa(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
__name(base64url, "base64url");
function base64urlDecode(input) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = input.length % 4;
  if (pad) input += "=".repeat(4 - pad);
  return atob(input);
}
__name(base64urlDecode, "base64urlDecode");
async function signJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(payload));
  const data = `${encHeader}.${encPayload}`;
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
    new TextEncoder().encode(data)
  );
  return `${data}.${base64url(
    String.fromCharCode(...new Uint8Array(signature))
  )}`;
}
__name(signJWT, "signJWT");
function decodeJWT(token) {
  const [, payload] = token.split(".");
  return JSON.parse(base64urlDecode(payload));
}
__name(decodeJWT, "decodeJWT");
async function requireUser(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const token = cookie.match(/session=([^;]+)/)?.[1];
  if (!token) {
    return null;
  }
  let payload;
  try {
    payload = decodeJWT(token);
  } catch {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1e3)) {
    return null;
  }
  const user = await env.DB.prepare(
    "SELECT id, email, user_name FROM users WHERE id = ?"
  ).bind(payload.sub).first();
  return user || null;
}
__name(requireUser, "requireUser");
var worker_default = {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders()
        });
      }
      if (url.pathname === "/health") {
        return new Response("flappypi-auth OK");
      }
      if (url.pathname === "/auth/login") {
        const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        google.searchParams.set("client_id", env.CLIENT_ID);
        google.searchParams.set("redirect_uri", env.REDIRECT_URI);
        google.searchParams.set("response_type", "code");
        google.searchParams.set("scope", "openid email profile");
        google.searchParams.set("prompt", "select_account");
        return Response.redirect(google.toString(), 302);
      }
      if (url.pathname === "/eggs/claim-free" && request.method === "POST") {
        try {
          const user = await requireUser(request, env);
          if (!user) {
            return new Response("Unauthorized", {
              status: 401,
              headers: corsHeaders()
            });
          }
          const now = Date.now();
          const row = await env.DB.prepare(`
        SELECT eggs, last_free_egg_at
        FROM users
        WHERE id = ?
      `).bind(user.id).first();
          const lastClaim = row?.last_free_egg_at || 0;
          if (now - lastClaim < FREE_EGG_COOLDOWN) {
            return new Response(
              JSON.stringify({
                ok: false,
                reason: "cooldown",
                next_claim_at: lastClaim + FREE_EGG_COOLDOWN
              }),
              {
                status: 429,
                headers: {
                  ...corsHeaders(),
                  "Content-Type": "application/json"
                }
              }
            );
          }
          await env.DB.batch([
            // sumar huevo
            env.DB.prepare(`
          UPDATE users
          SET
            eggs = eggs + 1,
            last_free_egg_at = ?
          WHERE id = ?
        `).bind(now, user.id),
            // registrar reward
            env.DB.prepare(`
          INSERT INTO egg_rewards (
            id,
            user_id,
            source,
            eggs,
            created_at
          ) VALUES (?, ?, ?, ?, ?)
        `).bind(
              crypto.randomUUID(),
              user.id,
              "free_8h",
              1,
              now
            )
          ]);
          return new Response(
            JSON.stringify({
              ok: true,
              eggs: row.eggs + 1,
              next_claim_at: now + FREE_EGG_COOLDOWN
            }),
            {
              headers: {
                ...corsHeaders(),
                "Content-Type": "application/json"
              }
            }
          );
        } catch (err) {
          const errorInfo = {
            name: err?.name,
            message: err?.message,
            stack: err?.stack,
            cause: err?.cause
          };
          console.error(
            "[/game/finish] ERROR DETALLADO:",
            JSON.stringify(errorInfo, null, 2)
          );
          return new Response(
            JSON.stringify({
              error: "finish_failed",
              message: err?.message || "Unknown error",
              code: err?.name || "UNEXPECTED_ERROR"
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders(),
                "Content-Type": "application/json"
              }
            }
          );
        }
      }
      if (url.pathname === "/auth/callback") {
        const code = url.searchParams.get("code");
        if (!code) return new Response("Missing code", { status: 400 });
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: env.CLIENT_ID,
            client_secret: env.CLIENT_SECRET,
            redirect_uri: env.REDIRECT_URI,
            grant_type: "authorization_code"
          })
        });
        const token = await tokenRes.json();
        if (!token.access_token) {
          return new Response(JSON.stringify(token), { status: 500 });
        }
        const userRes = await fetch(
          "https://openidconnect.googleapis.com/v1/userinfo",
          {
            headers: {
              Authorization: `Bearer ${token.access_token}`
            }
          }
        );
        const user = await userRes.json();
        if (!user.sub || !user.email) {
          return new Response("Invalid user", { status: 500 });
        }
        const generatedUsername = await generateUniqueUsername(env, user.sub);
        await env.DB.prepare(
          `
        INSERT INTO users (id, email, name, picture, user_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          picture = excluded.picture
        `
        ).bind(
          user.sub,
          user.email,
          user.name || null,
          user.picture || null,
          generatedUsername,
          Date.now()
        ).run();
        const jwt = await signJWT(
          {
            sub: user.sub,
            email: user.email,
            name: user.name,
            iat: Math.floor(Date.now() / 1e3),
            exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 30
          },
          env.JWT_SECRET
        );
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders(),
            "Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/`,
            "Location": "http://localhost:3000"
          }
        });
      }
      if (url.pathname === "/me") {
        const cookie = request.headers.get("Cookie") || "";
        const token = cookie.match(/session=([^;]+)/)?.[1];
        if (!token) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders()
          });
        }
        const payload = decodeJWT(token);
        if (payload.exp < Math.floor(Date.now() / 1e3)) {
          return new Response("Token expired", {
            status: 401,
            headers: corsHeaders()
          });
        }
        const user = await env.DB.prepare(`
        SELECT
          id,
          name,
          picture,
          eggs,
          last_free_egg_at,
          user_name,
          pi_wallet,
          twitter,
          COALESCE(max_score, 0) AS max_score,
          COALESCE(total_score, 0) AS total_score,
          created_at
        FROM users
        WHERE id = ?
      `).bind(payload.sub).first();
        if (!user) {
          return new Response("User not found", {
            status: 401,
            headers: corsHeaders()
          });
        }
        const rankRow = await env.DB.prepare(`
        SELECT COUNT(*) + 1 AS rank
        FROM users
        WHERE
          COALESCE(total_score, 0) > ?
          OR (
            COALESCE(total_score, 0) = ?
            AND created_at < ?
          )
      `).bind(
          user.total_score,
          user.total_score,
          user.created_at
        ).first();
        return new Response(JSON.stringify({
          id: user.id,
          name: user.name,
          eggs: user.eggs,
          last_free_egg_at: user.last_free_egg_at,
          user_name: user.user_name,
          pi_wallet: user.pi_wallet,
          twitter: user.twitter,
          picture: user.picture,
          max_score: user.max_score,
          total_score: user.total_score,
          rank_total: rankRow.rank
        }), {
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json"
          }
        });
      }
      if (url.pathname === "/tops") {
        const key = cacheKey("tops");
        const cached = await caches.default.match(key);
        if (cached) return cached;
        const topBest = await env.DB.prepare(`
        SELECT name, user_name, max_score
        FROM users
        WHERE max_score > 0
        ORDER BY max_score DESC, created_at ASC
        LIMIT 3
      `).all();
        const topTotal = await env.DB.prepare(`
        SELECT name, user_name, total_score
        FROM users
        WHERE total_score > 0
        ORDER BY total_score DESC, created_at ASC
        LIMIT 3
      `).all();
        const response = new Response(JSON.stringify({
          best: topBest.results,
          total: topTotal.results
        }), {
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json"
          }
        });
        await caches.default.put(
          key,
          response.clone(),
          { expirationTtl: 30 }
        );
        return response;
      }
      if (url.pathname === "/profile/update" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders()
          });
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", {
            status: 400,
            headers: corsHeaders()
          });
        }
        const { name, wallet, twitter } = body;
        if (!name || !name.trim()) {
          return new Response("Name required", {
            status: 400,
            headers: corsHeaders()
          });
        }
        if (wallet && wallet.length > 120) {
          return new Response("Invalid wallet", {
            status: 400,
            headers: corsHeaders()
          });
        }
        let twitterClean = null;
        if (twitter) {
          twitterClean = twitter.replace(/^@/, "").trim();
          if (!/^[a-zA-Z0-9_]{1,15}$/.test(twitterClean)) {
            return new Response("Invalid Twitter username", {
              status: 400,
              headers: corsHeaders()
            });
          }
        }
        await env.DB.prepare(`
        UPDATE users
        SET
          name = ?,
          pi_wallet = ?,
          twitter = ?
        WHERE id = ?
      `).bind(
          name.trim(),
          wallet?.trim() || null,
          twitterClean,
          user.id
        ).run();
        return new Response(
          JSON.stringify({ ok: true }),
          {
            status: 200,
            headers: {
              ...corsHeaders(),
              "Content-Type": "application/json"
            }
          }
        );
      }
      if (url.pathname === "/game/revive" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders()
          });
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", {
            status: 400,
            headers: corsHeaders()
          });
        }
        const { gameToken } = body;
        if (!gameToken) {
          return new Response("Missing game token", {
            status: 400,
            headers: corsHeaders()
          });
        }
        let payload;
        try {
          payload = decodeJWT(gameToken);
        } catch {
          return new Response("Invalid game token", {
            status: 401,
            headers: corsHeaders()
          });
        }
        if (payload.sub !== user.id || payload.type !== "game") {
          return new Response("Invalid game token", {
            status: 401,
            headers: corsHeaders()
          });
        }
        const { game_uid } = payload;
        if (!game_uid) {
          return new Response("Invalid game context", {
            status: 400,
            headers: corsHeaders()
          });
        }
        const eggsCost = 5;
        const dbUser = await env.DB.prepare(
          "SELECT eggs FROM users WHERE id = ?"
        ).bind(user.id).first();
        if (!dbUser || dbUser.eggs < eggsCost) {
          return new Response("Not enough eggs", {
            status: 400,
            headers: corsHeaders()
          });
        }
        const reviveKey1 = cacheKey(`revive-count/${user.id}`);
        const reviveEntry = await caches.default.match(reviveKey1);
        const reviveCount = reviveEntry ? parseInt(await reviveEntry.text(), 10) : 0;
        const reviveNo = reviveCount + 1;
        await env.DB.batch([
          // 🥚 Descontar huevos (protegido)
          env.DB.prepare(`
          UPDATE users
          SET eggs = eggs - ?
          WHERE id = ? AND eggs >= ?
        `).bind(eggsCost, user.id, eggsCost),
          // 🧾 Registrar revive (solo control / auditoría)
          env.DB.prepare(`
          INSERT INTO game_revives (
            id,
            game_uid,
            user_id,
            revive_no,
            eggs_used,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            game_uid,
            user.id,
            reviveNo,
            eggsCost,
            Date.now()
          )
        ]);
        const reviveKey = cacheKey(`revive-count/${user.id}`);
        await caches.default.put(
          reviveKey,
          new Response(String(reviveNo), {
            headers: { "Cache-Control": "max-age=86400" }
          })
        );
        return new Response(
          JSON.stringify({
            ok: true,
            revive_no: reviveNo,
            eggs_left: dbUser.eggs - eggsCost
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders(),
              "Content-Type": "application/json"
            }
          }
        );
      }
      if (url.pathname === "/logout") {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders(),
            // borrar cookie
            "Set-Cookie": "session=; HttpOnly; SameSite=None; Path=/; Max-Age=0",
            // volver al frontend
            "Location": "http://localhost:3000"
          }
        });
      }
      if (url.pathname === "/game/finish" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders()
          });
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", {
            status: 400,
            headers: corsHeaders()
          });
        }
        const { score, jumps, positions, startedAt, gameToken } = body;
        const { nonce, game_uid } = decodeJWT(gameToken);
        const durationSec = (Date.now() - startedAt) / 1e3;
        const MAX_SCORE_PER_SEC = 3;
        if (score > durationSec * MAX_SCORE_PER_SEC) {
          return new Response("Score/time anomaly", {
            status: 403,
            headers: corsHeaders()
          });
        }
        if (!Number.isInteger(score) || score < 0) {
          return new Response("Invalid score", {
            status: 400,
            headers: corsHeaders()
          });
        }
        if (!gameToken) {
          return new Response("Missing game token", {
            status: 401,
            headers: corsHeaders()
          });
        }
        let payload;
        try {
          payload = decodeJWT(gameToken);
        } catch {
          return new Response("Invalid game token", {
            status: 401,
            headers: corsHeaders()
          });
        }
        if (payload.type !== "game" || payload.sub !== user.id) {
          return new Response("Invalid game token", {
            status: 401,
            headers: corsHeaders()
          });
        }
        if (env.ENV !== "dev") {
          const activeKey = cacheKey(`game-active/${user.id}`);
          const active = await caches.default.match(activeKey);
          if (!active || await active.text() !== payload.nonce) {
            return new Response("Not active game", {
              status: 401,
              headers: corsHeaders()
            });
          }
          const nonceKey = cacheKey(`game-nonce/${payload.nonce}`);
          const nonceEntry = await caches.default.match(nonceKey);
          if (!nonceEntry) {
            return new Response("Game already used", {
              status: 401,
              headers: corsHeaders()
            });
          }
          await caches.default.delete(nonceKey);
          await caches.default.delete(`game-active:${user.id}`);
        }
        const lastGame = await env.DB.prepare(`
        SELECT id, score
        FROM games
        WHERE user_id = ?
          AND game_uid = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(user.id, game_uid).first();
        const lastScore = lastGame ? lastGame.score : 0;
        const deltaScore = score - lastScore;
        const parentId = lastGame ? lastGame.id : null;
        const isFirstInsert = !lastGame;
        if (lastGame && score < lastScore) {
          return new Response("Invalid score regression", {
            status: 400,
            headers: corsHeaders()
          });
        }
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO games (user_id, score, id_parent, created_at, game_uid) VALUES (?, ?, ?, ?, ?)"
          ).bind(user.id, score, parentId, Date.now(), game_uid),
          env.DB.prepare(
            `
          UPDATE users SET
            games_played = games_played + ?,
            total_score = total_score + ?,
            max_score = CASE
              WHEN ? > max_score THEN ?
              ELSE max_score
            END
          WHERE id = ?
          `
          ).bind(isFirstInsert ? 1 : 0, deltaScore, score, score, user.id)
        ]);
        return new Response(
          JSON.stringify({ ok: true }),
          {
            status: 200,
            headers: {
              ...corsHeaders(),
              "Content-Type": "application/json"
            }
          }
        );
      }
      if (url.pathname === "/game/start" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders()
          });
        }
        const nonce = crypto.randomUUID();
        const gameUid = crypto.randomUUID();
        const gameToken = await signJWT(
          {
            sub: user.id,
            nonce,
            game_uid: gameUid,
            // 🎯 lo que nos interesa ahora
            type: "game",
            iat: Math.floor(Date.now() / 1e3),
            exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24
            // 24h
          },
          env.JWT_SECRET
        );
        if (env.ENV !== "dev") {
          try {
            const activeKey = cacheKey(`game-active/${user.id}`);
            await caches.default.put(
              activeKey,
              new Response(nonce, {
                headers: { "Cache-Control": "max-age=86400" }
              })
            );
            const nonceKey = cacheKey(`game-nonce/${nonce}`);
            await caches.default.put(
              nonceKey,
              new Response("valid", {
                headers: { "Cache-Control": "max-age=86400" }
              })
            );
          } catch (e) {
            console.warn("Cache not available:", e);
          }
        }
        await caches.default.put(
          cacheKey(`revive-count/${user.id}`),
          new Response("0", {
            headers: { "Cache-Control": "max-age=86400" }
          })
        );
        return new Response(
          JSON.stringify({ gameToken }),
          {
            status: 200,
            headers: {
              ...corsHeaders(),
              "Content-Type": "application/json"
            }
          }
        );
      }
      return new Response("Not Found", { status: 404 });
    } catch (err) {
      if (err instanceof Response) {
        return new Response(err.body, {
          status: err.status,
          headers: corsHeaders()
        });
      }
      return new Response("Internal Server Error", {
        status: 500,
        headers: corsHeaders()
      });
    }
  }
};

// ../../../../Users/mverg/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../Users/mverg/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-TJtHKa/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../../Users/mverg/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-TJtHKa/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
