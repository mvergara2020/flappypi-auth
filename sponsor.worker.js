import { routeShopCatalog } from "./shop-catalog.worker.js";

const SPONSOR_USD_CENTS = 500;
const MAX_SPONSOR_BYTES = 5 * 1024 * 1024;
const MAX_URL_CHARS = 500;
const MAX_TITLE_CHARS = 60;
const SPONSOR_CONTENT_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
const BLOCKED_URL_TERMS = [
  "porn", "xxx", "adult", "sexcam", "casino", "gambling", "sportsbook",
  "betting", "bet365", "cocaine", "heroin", "fentanyl", "methamphetamine",
  "weapon", "firearm", "ammo", "malware", "phishing", "ransomware"
];

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

function safeText(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

async function ensureSchema(env) {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_sponsors (
        sponsor_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        storage_key TEXT NOT NULL UNIQUE,
        content_type TEXT NOT NULL,
        target_url TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        usd_cents INTEGER NOT NULL DEFAULT 500,
        coin_cost INTEGER NOT NULL,
        coins_per_usd INTEGER NOT NULL,
        moderation_status TEXT NOT NULL DEFAULT 'PENDING',
        moderation_reason TEXT,
        created_at INTEGER NOT NULL,
        approved_at INTEGER,
        views INTEGER NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0
      )
    `).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_user_sponsors_status_recent ON user_sponsors(moderation_status,created_at DESC)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_user_sponsors_user_recent ON user_sponsors(user_id,created_at DESC)`).run();
  })().catch(error => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function sponsorQuote(env) {
  const internalUrl = new URL("https://internal.flappypi/shop/flappycoin/catalog");
  const internalRequest = new Request(internalUrl.href, { method:"GET" });
  const response = await routeShopCatalog(internalRequest, env, internalUrl);
  if (!response?.ok) throw new Error("SPONSOR_CATALOG_UNAVAILABLE");
  const catalog = await response.json();
  const packs = Array.isArray(catalog?.packs) ? catalog.packs : [];
  const recommended = packs.find(pack => pack.id === catalog?.recommended_pack_id) || packs.find(pack => pack.featured) || packs[0];
  const rawCoinsPerUsd = Number(recommended?.coins_per_usd || 0);
  if (!Number.isFinite(rawCoinsPerUsd) || rawCoinsPerUsd <= 0) throw new Error("SPONSOR_RATE_UNAVAILABLE");
  const coinsPerUsd = Math.round(rawCoinsPerUsd);
  const coinCost = Math.ceil((SPONSOR_USD_CENTS / 100) * coinsPerUsd);
  return {
    usd_cents: SPONSOR_USD_CENTS,
    usd_price: SPONSOR_USD_CENTS / 100,
    coins_per_usd: coinsPerUsd,
    coin_cost: coinCost,
    catalog_version: catalog?.catalog_version || null,
    rate_pack_id: recommended?.id || null
  };
}

function isIpLiteral(hostname) {
  if (!hostname) return true;
  if (hostname.includes(":")) return true;
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function validateTargetUrl(raw) {
  const text = String(raw ?? "").trim();
  if (!text || text.length > MAX_URL_CHARS) return { ok:false, code:"SPONSOR_URL_INVALID" };
  let url;
  try { url = new URL(text); }
  catch (_) { return { ok:false, code:"SPONSOR_URL_INVALID" }; }
  if (url.protocol !== "https:") return { ok:false, code:"SPONSOR_URL_HTTPS_REQUIRED" };
  if (url.username || url.password) return { ok:false, code:"SPONSOR_URL_CREDENTIALS_NOT_ALLOWED" };
  if (url.port && url.port !== "443") return { ok:false, code:"SPONSOR_URL_PORT_NOT_ALLOWED" };
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || isIpLiteral(host)) {
    return { ok:false, code:"SPONSOR_URL_HOST_NOT_ALLOWED" };
  }
  const searchable = `${host}${url.pathname}${url.search}`.toLowerCase();
  if (BLOCKED_URL_TERMS.some(term => searchable.includes(term))) return { ok:false, code:"SPONSOR_URL_CONTENT_NOT_ALLOWED" };
  url.hash = "";
  return { ok:true, url:url.href };
}

function matchesImageSignature(bytes, contentType) {
  const b = new Uint8Array(bytes);
  if (contentType === "image/jpeg") return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (contentType === "image/png") return b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a;
  if (contentType === "image/webp") {
    return b.length >= 12 && String.fromCharCode(...b.slice(0,4)) === "RIFF" && String.fromCharCode(...b.slice(8,12)) === "WEBP";
  }
  return false;
}

function publicSponsor(row, origin) {
  const file = String(row.storage_key || "").replace(/^sponsors\//, "");
  return {
    sponsor_id: row.sponsor_id,
    user_id: row.user_id,
    user_name: row.user_name || null,
    name: row.name || null,
    target_url: row.target_url,
    title: row.title || "",
    created_at: Number(row.created_at || 0),
    views: Number(row.views || 0),
    clicks: Number(row.clicks || 0),
    image_url: `${origin}/sponsors/image/${file}`
  };
}

async function listSponsors(request, env, helpers, url) {
  if (request.method !== "GET" || url.pathname !== "/sponsors") return null;
  await ensureSchema(env);
  const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") || 8)));
  const rows = await env.DB.prepare(`
    SELECT s.*,u.user_name,u.name
    FROM user_sponsors s
    LEFT JOIN users u ON u.id=s.user_id
    WHERE s.moderation_status='APPROVED'
    ORDER BY s.created_at DESC
    LIMIT ?
  `).bind(limit).all();
  return json({ ok:true, sponsors:(rows?.results || []).map(row => publicSponsor(row, url.origin)) }, 200, request, helpers.corsHeaders);
}

async function uploadSponsor(request, env, helpers, url) {
  if (request.method !== "POST" || url.pathname !== "/sponsors") return null;
  const user = await helpers.requireUser(request, env);
  if (!user) return new Response("Unauthorized", { status:401, headers:helpers.corsHeaders(request) });

  const account = await env.DB.prepare(`SELECT auth_provider,COALESCE(eggs,0) AS eggs FROM users WHERE id=? LIMIT 1`).bind(user.id).first();
  if (!account || String(account.auth_provider || "").toLowerCase() === "guest") {
    return json({ ok:false, code:"SPONSOR_REGISTERED_ACCOUNT_REQUIRED" }, 403, request, helpers.corsHeaders);
  }

  if (!env.GAME_PHOTOS || typeof env.GAME_PHOTOS.put !== "function") return json({ ok:false, code:"SPONSOR_STORAGE_NOT_CONFIGURED" }, 503, request, helpers.corsHeaders);

  const target = validateTargetUrl(url.searchParams.get("url"));
  if (!target.ok) return json({ ok:false, code:target.code }, 400, request, helpers.corsHeaders);
  const title = safeText(url.searchParams.get("title"), MAX_TITLE_CHARS);
  const contentType = String(request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  const ext = SPONSOR_CONTENT_TYPES.get(contentType);
  if (!ext) return json({ ok:false, code:"SPONSOR_IMAGE_TYPE_NOT_ALLOWED" }, 415, request, helpers.corsHeaders);
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_SPONSOR_BYTES) return json({ ok:false, code:"SPONSOR_IMAGE_TOO_LARGE", max_bytes:MAX_SPONSOR_BYTES }, 413, request, helpers.corsHeaders);
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_SPONSOR_BYTES) return json({ ok:false, code:"SPONSOR_IMAGE_TOO_LARGE", max_bytes:MAX_SPONSOR_BYTES }, 413, request, helpers.corsHeaders);
  if (!matchesImageSignature(bytes, contentType)) return json({ ok:false, code:"SPONSOR_IMAGE_SIGNATURE_INVALID" }, 415, request, helpers.corsHeaders);

  await ensureSchema(env);
  let quote;
  try { quote = await sponsorQuote(env); }
  catch (error) {
    console.error("[SPONSOR QUOTE]", error);
    return json({ ok:false, code:"SPONSOR_QUOTE_UNAVAILABLE" }, 503, request, helpers.corsHeaders);
  }

  const sponsorId = crypto.randomUUID();
  const key = `sponsors/${sponsorId}.${ext}`;
  const now = Date.now();
  const status = String(env?.ENV || "").toLowerCase() === "dev" ? "APPROVED" : "PENDING";
  const approvedAt = status === "APPROVED" ? now : null;

  await env.GAME_PHOTOS.put(key, bytes, {
    httpMetadata:{ contentType, cacheControl:"public, max-age=31536000, immutable" },
    customMetadata:{ owner_user_id:String(user.id), sponsor_id:sponsorId, target_host:new URL(target.url).hostname, created_at:String(now) }
  });

  const debit = await env.DB.prepare(`UPDATE users SET eggs=eggs-? WHERE id=? AND eggs>=?`).bind(quote.coin_cost, user.id, quote.coin_cost).run();
  if (Number(debit?.meta?.changes || 0) !== 1) {
    try { await env.GAME_PHOTOS.delete(key); } catch (_) {}
    const current = await env.DB.prepare(`SELECT COALESCE(eggs,0) AS eggs FROM users WHERE id=?`).bind(user.id).first();
    return json({ ok:false, code:"SPONSOR_NOT_ENOUGH_FLAPPYCOIN", required:quote.coin_cost, eggs:Number(current?.eggs || 0) }, 409, request, helpers.corsHeaders);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO user_sponsors (
        sponsor_id,user_id,storage_key,content_type,target_url,title,usd_cents,coin_cost,coins_per_usd,
        moderation_status,moderation_reason,created_at,approved_at,views,clicks
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,0)
    `).bind(
      sponsorId,user.id,key,contentType,target.url,title,quote.usd_cents,quote.coin_cost,quote.coins_per_usd,
      status,status === "APPROVED" ? "DEV_AUTO_APPROVED" : "PENDING_REVIEW",now,approvedAt
    ).run();
  } catch (error) {
    try { await env.DB.prepare(`UPDATE users SET eggs=eggs+? WHERE id=?`).bind(quote.coin_cost, user.id).run(); } catch (_) {}
    try { await env.GAME_PHOTOS.delete(key); } catch (_) {}
    console.error("[SPONSOR INSERT]", error);
    return json({ ok:false, code:"SPONSOR_CREATE_FAILED" }, 500, request, helpers.corsHeaders);
  }

  const updated = await env.DB.prepare(`SELECT COALESCE(eggs,0) AS eggs FROM users WHERE id=?`).bind(user.id).first();
  return json({
    ok:true,
    sponsor_id:sponsorId,
    moderation_status:status,
    remaining_eggs:Number(updated?.eggs || 0),
    quote,
    target_url:target.url,
    image_url:`${url.origin}/sponsors/image/${sponsorId}.${ext}`
  }, 201, request, helpers.corsHeaders);
}

async function sponsorImage(request, env, helpers, url) {
  const match = url.pathname.match(/^\/sponsors\/image\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i);
  if (!match || (request.method !== "GET" && request.method !== "HEAD")) return null;
  if (!env.GAME_PHOTOS || typeof env.GAME_PHOTOS.get !== "function") return new Response("Sponsor storage unavailable", { status:503, headers:helpers.corsHeaders(request) });
  const object = await env.GAME_PHOTOS.get(`sponsors/${match[1].toLowerCase()}`);
  if (!object) return new Response("Not Found", { status:404, headers:helpers.corsHeaders(request) });
  const headers = new Headers(helpers.corsHeaders(request));
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(request.method === "HEAD" ? null : object.body, { status:200, headers });
}

async function trackSponsor(request, env, helpers, url) {
  const match = url.pathname.match(/^\/sponsors\/([0-9a-f-]{36})\/(view|click)$/i);
  if (!match || request.method !== "POST") return null;
  await ensureSchema(env);
  const sponsorId = match[1].toLowerCase();
  const action = match[2].toLowerCase();
  const column = action === "click" ? "clicks" : "views";
  await env.DB.prepare(`UPDATE user_sponsors SET ${column}=${column}+1 WHERE sponsor_id=? AND moderation_status='APPROVED'`).bind(sponsorId).run();
  const row = await env.DB.prepare(`SELECT target_url,views,clicks FROM user_sponsors WHERE sponsor_id=? AND moderation_status='APPROVED'`).bind(sponsorId).first();
  if (!row) return json({ ok:false, code:"SPONSOR_NOT_FOUND" }, 404, request, helpers.corsHeaders);
  return json({ ok:true, target_url:row.target_url, views:Number(row.views || 0), clicks:Number(row.clicks || 0) }, 200, request, helpers.corsHeaders);
}

export async function routeSponsors(request, env, helpers = {}) {
  const url = new URL(request.url);
  if (typeof helpers.corsHeaders !== "function" || typeof helpers.requireUser !== "function") return null;

  if (request.method === "GET" && url.pathname === "/sponsors/quote") {
    let quote;
    try { quote = await sponsorQuote(env); }
    catch (_) { return json({ ok:false, code:"SPONSOR_QUOTE_UNAVAILABLE" }, 503, request, helpers.corsHeaders); }
    return json({ ok:true, ...quote }, 200, request, helpers.corsHeaders);
  }

  return await listSponsors(request, env, helpers, url)
    || await uploadSponsor(request, env, helpers, url)
    || await sponsorImage(request, env, helpers, url)
    || await trackSponsor(request, env, helpers, url)
    || null;
}
