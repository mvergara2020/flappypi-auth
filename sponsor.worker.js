import { routeShopCatalog } from "./shop-catalog.worker.js";

const SPONSOR_USD_CENTS = 500;
const MAX_SPONSOR_BYTES = 5 * 1024 * 1024;
const MAX_TITLE_CHARS = 60;
const PAYMENT_INTENT_TTL_MS = 20 * 60 * 1000;
const SPONSOR_CONTENT_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
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

async function ensureColumn(env, table, column, definition) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  if ((info?.results || []).some(row => String(row.name) === column)) return;
  await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
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
    await ensureColumn(env, "user_sponsors", "paid_pi", "REAL");
    await ensureColumn(env, "user_sponsors", "payment_id", "TEXT");
    await ensureColumn(env, "user_sponsors", "txid", "TEXT");
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS sponsor_payment_intents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sponsor_id TEXT NOT NULL UNIQUE,
        storage_key TEXT NOT NULL UNIQUE,
        content_type TEXT NOT NULL,
        expected_pi REAL NOT NULL,
        pi_usd_price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'CREATED',
        payment_id TEXT,
        txid TEXT,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_sponsor_payment_intents_user ON sponsor_payment_intents(user_id,created_at DESC)`).run();
    await env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sponsors_payment_id ON user_sponsors(payment_id) WHERE payment_id IS NOT NULL`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_user_sponsors_status_recent ON user_sponsors(moderation_status,created_at DESC)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_user_sponsors_user_recent ON user_sponsors(user_id,created_at DESC)`).run();
  })().catch(error => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function sponsorQuote(env) {
  const internalUrl = new URL("https://internal.flappypi/shop/flappycoin/pi-price");
  const internalRequest = new Request(internalUrl.href, { method:"GET" });
  const response = await routeShopCatalog(internalRequest, env, internalUrl);
  if (!response?.ok) throw new Error("SPONSOR_PI_PRICE_UNAVAILABLE");
  const price = await response.json();
  const piUsdPrice = Number(price?.pi_price || 0);
  if (!Number.isFinite(piUsdPrice) || piUsdPrice <= 0) throw new Error("SPONSOR_PI_PRICE_UNAVAILABLE");
  const rawAmount = (SPONSOR_USD_CENTS / 100) / piUsdPrice;
  const amount = Number((Math.ceil((rawAmount - Number.EPSILON) * 100) / 100).toFixed(2));
  return {
    amount,
    currency:"PI",
    quoted_at:Date.now(),
    refresh_after_ms:5 * 60 * 1000,
    price_source:price?.source || null,
    price_fallback:price?.fallback === true,
    pi_usd_price:piUsdPrice
  };
}

async function piApi(env, path, options = {}) {
  const apiKey = safeText(env.PI_API_KEY, 300);
  if (!apiKey) throw new Error("PI_API_KEY_NOT_CONFIGURED");
  const response = await fetch(`https://api.minepi.com/v2${path}`, {
    method:options.method || "GET",
    headers:{ "Authorization":`Key ${apiKey}`, ...(options.body ? { "Content-Type":"application/json" } : {}) },
    body:options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || data?.message || `PI_HTTP_${response.status}`);
  return data;
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

  const limit = Math.max(1, Math.min(20, Math.floor(Number(url.searchParams.get("limit") || 8))));
  const requestedPage = Math.max(1, Math.floor(Number(url.searchParams.get("page") || 1)));
  const countRow = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM user_sponsors
    WHERE moderation_status='APPROVED'
  `).first();

  const total = Math.max(0, Number(countRow?.total || 0));
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * limit;

  const rows = await env.DB.prepare(`
    SELECT s.*,u.user_name,u.name
    FROM user_sponsors s
    LEFT JOIN users u ON u.id=s.user_id
    WHERE s.moderation_status='APPROVED'
    ORDER BY s.created_at DESC,s.sponsor_id DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  return json({
    ok:true,
    sponsors:(rows?.results || []).map(row => publicSponsor(row, url.origin)),
    pagination:{
      page,
      limit,
      total,
      total_pages:totalPages,
      has_previous:page > 1,
      has_more:page < totalPages
    }
  }, 200, request, helpers.corsHeaders);
}

async function createSponsorPayment(request, env, helpers, url) {
  if (request.method !== "POST" || url.pathname !== "/sponsors/pi-create") return null;
  const user = await helpers.requireUser(request, env);
  if (!user) return new Response("Unauthorized", { status:401, headers:helpers.corsHeaders(request) });

  const account = await env.DB.prepare(`SELECT id FROM users WHERE id=? LIMIT 1`).bind(user.id).first();
  if (!account) {
    return json({ ok:false, code:"SPONSOR_ACCOUNT_NOT_FOUND" }, 404, request, helpers.corsHeaders);
  }

  if (!env.GAME_PHOTOS || typeof env.GAME_PHOTOS.put !== "function") return json({ ok:false, code:"SPONSOR_STORAGE_NOT_CONFIGURED" }, 503, request, helpers.corsHeaders);

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
  const internalId = crypto.randomUUID();
  const key = `sponsors/${sponsorId}.${ext}`;
  const now = Date.now();

  await env.GAME_PHOTOS.put(key, bytes, {
    httpMetadata:{ contentType, cacheControl:"public, max-age=31536000, immutable" },
    customMetadata:{ owner_user_id:String(user.id), sponsor_id:sponsorId, payment_intent_id:internalId, created_at:String(now) }
  });

  try {
    await env.DB.prepare(`
      INSERT INTO sponsor_payment_intents
      (id,user_id,sponsor_id,storage_key,content_type,expected_pi,pi_usd_price,status,expires_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,'CREATED',?,?,?)
    `).bind(internalId,user.id,sponsorId,key,contentType,quote.amount,quote.pi_usd_price,now + PAYMENT_INTENT_TTL_MS,now,now).run();
  } catch (error) {
    try { await env.GAME_PHOTOS.delete(key); } catch (_) {}
    console.error("[SPONSOR PAYMENT INTENT]", error);
    return json({ ok:false, code:"SPONSOR_PAYMENT_INTENT_FAILED" }, 500, request, helpers.corsHeaders);
  }

  return json({
    ok:true,
    internal_id:internalId,
    sponsor_id:sponsorId,
    amount:quote.amount,
    currency:"PI",
    memo:"FlappyPi sponsor promotion",
    metadata:{ type:"SPONSOR_PROMOTION", product_code:"FLAPPYPI_SPONSOR", internal_id:internalId, sponsor_id:sponsorId, user_id:user.id }
  }, 201, request, helpers.corsHeaders);
}

async function processSponsorPayment(request, env, helpers, url) {
  if (request.method !== "POST" || !["/sponsors/pi-approve","/sponsors/pi-complete"].includes(url.pathname)) return null;
  const user = await helpers.requireUser(request, env);
  if (!user) return new Response("Unauthorized", { status:401, headers:helpers.corsHeaders(request) });
  await ensureSchema(env);

  let body = {};
  try { body = await request.json(); } catch (_) { return json({ ok:false, code:"INVALID_JSON" }, 400, request, helpers.corsHeaders); }
  const internalId = safeText(body?.internal_id, 80);
  const paymentId = safeText(body?.payment_id, 140);
  const txid = safeText(body?.txid, 160);
  const intent = await env.DB.prepare(`SELECT * FROM sponsor_payment_intents WHERE id=? AND user_id=? LIMIT 1`).bind(internalId,user.id).first();
  if (!intent || !paymentId) return json({ ok:false, code:"PAYMENT_INTENT_NOT_FOUND" }, 404, request, helpers.corsHeaders);
  if (intent.status === "COMPLETED") {
    const sponsor = await env.DB.prepare(`SELECT moderation_status FROM user_sponsors WHERE sponsor_id=? LIMIT 1`).bind(intent.sponsor_id).first();
    return json({ ok:true, completed:true, sponsor_id:intent.sponsor_id, moderation_status:sponsor?.moderation_status || "PENDING" }, 200, request, helpers.corsHeaders);
  }
  if (Date.now() > Number(intent.expires_at || 0) && intent.status !== "APPROVED") return json({ ok:false, code:"PAYMENT_INTENT_EXPIRED" }, 409, request, helpers.corsHeaders);

  const payment = await piApi(env, `/payments/${encodeURIComponent(paymentId)}`);
  const meta = payment?.metadata || {};
  const amountOk = Math.abs(Number(payment?.amount || 0) - Number(intent.expected_pi || 0)) <= 0.0000002;
  const metaOk = String(meta.internal_id || meta.internalId || "") === internalId && String(meta.sponsor_id || "") === String(intent.sponsor_id);
  const ownerOk = !payment?.user_uid || String(payment.user_uid) === String(user.id);
  if (!amountOk || !metaOk || !ownerOk) return json({ ok:false, code:"PI_PAYMENT_CONTEXT_MISMATCH" }, 409, request, helpers.corsHeaders);

  if (url.pathname.endsWith("pi-approve")) {
    await piApi(env, `/payments/${encodeURIComponent(paymentId)}/approve`, { method:"POST", body:{} });
    await env.DB.prepare(`UPDATE sponsor_payment_intents SET status='APPROVED',payment_id=?,updated_at=? WHERE id=?`).bind(paymentId,Date.now(),internalId).run();
    return json({ ok:true, approved:true }, 200, request, helpers.corsHeaders);
  }

  if (!txid) return json({ ok:false, code:"TXID_REQUIRED" }, 400, request, helpers.corsHeaders);
  await piApi(env, `/payments/${encodeURIComponent(paymentId)}/complete`, { method:"POST", body:{txid} });
  const verified = await piApi(env, `/payments/${encodeURIComponent(paymentId)}`);
  const completed = verified?.status?.developer_completed === true;
  const verifiedTxid = String(verified?.transaction?.txid || "");
  if (!completed || (verifiedTxid && verifiedTxid !== txid)) return json({ ok:false, code:"PI_PAYMENT_NOT_COMPLETED" }, 409, request, helpers.corsHeaders);

  const now = Date.now();
  const status = String(env?.ENV || "").toLowerCase() === "dev" ? "APPROVED" : "PENDING";
  const approvedAt = status === "APPROVED" ? now : null;
  await env.DB.batch([
    env.DB.prepare(`
      INSERT OR IGNORE INTO user_sponsors
      (sponsor_id,user_id,storage_key,content_type,target_url,title,usd_cents,coin_cost,coins_per_usd,moderation_status,moderation_reason,created_at,approved_at,views,clicks,paid_pi,payment_id,txid)
      VALUES (?,?,?,?,'','',?,0,0,?,?,?,?,0,0,?,?,?)
    `).bind(intent.sponsor_id,user.id,intent.storage_key,intent.content_type,SPONSOR_USD_CENTS,status,status === "APPROVED" ? "DEV_AUTO_APPROVED" : "PENDING_REVIEW",now,approvedAt,Number(intent.expected_pi || 0),paymentId,txid),
    env.DB.prepare(`UPDATE sponsor_payment_intents SET status='COMPLETED',payment_id=?,txid=?,updated_at=? WHERE id=?`).bind(paymentId,txid,now,internalId)
  ]);

  return json({ ok:true, completed:true, sponsor_id:intent.sponsor_id, moderation_status:status, image_url:`${url.origin}/sponsors/image/${String(intent.storage_key).replace(/^sponsors\//,"")}` }, 200, request, helpers.corsHeaders);
}

async function cancelSponsorPayment(request, env, helpers, url) {
  if (request.method !== "POST" || url.pathname !== "/sponsors/pi-cancel") return null;
  const user = await helpers.requireUser(request, env);
  if (!user) return new Response("Unauthorized", { status:401, headers:helpers.corsHeaders(request) });
  await ensureSchema(env);
  let body = {};
  try { body = await request.json(); } catch (_) {}
  const internalId = safeText(body?.internal_id, 80);
  const intent = await env.DB.prepare(`SELECT storage_key,status FROM sponsor_payment_intents WHERE id=? AND user_id=? LIMIT 1`).bind(internalId,user.id).first();
  if (!intent) return json({ ok:true, cancelled:false }, 200, request, helpers.corsHeaders);
  if (intent.status === "COMPLETED") return json({ ok:false, code:"SPONSOR_ALREADY_PAID" }, 409, request, helpers.corsHeaders);
  await env.DB.prepare(`UPDATE sponsor_payment_intents SET status='CANCELLED',updated_at=? WHERE id=? AND user_id=?`).bind(Date.now(),internalId,user.id).run();
  try { await env.GAME_PHOTOS?.delete?.(intent.storage_key); } catch (_) {}
  return json({ ok:true, cancelled:true }, 200, request, helpers.corsHeaders);
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
  const row = await env.DB.prepare(`SELECT views,clicks FROM user_sponsors WHERE sponsor_id=? AND moderation_status='APPROVED'`).bind(sponsorId).first();
  if (!row) return json({ ok:false, code:"SPONSOR_NOT_FOUND" }, 404, request, helpers.corsHeaders);
  return json({ ok:true, views:Number(row.views || 0), clicks:Number(row.clicks || 0) }, 200, request, helpers.corsHeaders);
}

export async function routeSponsors(request, env, helpers = {}) {
  const url = new URL(request.url);
  if (typeof helpers.corsHeaders !== "function" || typeof helpers.requireUser !== "function") return null;

  if (request.method === "GET" && url.pathname === "/sponsors/quote") {
    let quote;
    try { quote = await sponsorQuote(env); }
    catch (_) { return json({ ok:false, code:"SPONSOR_QUOTE_UNAVAILABLE" }, 503, request, helpers.corsHeaders); }
    return json({
      ok:true,
      amount:quote.amount,
      currency:quote.currency,
      quoted_at:quote.quoted_at,
      refresh_after_ms:quote.refresh_after_ms,
      price_source:quote.price_source,
      price_fallback:quote.price_fallback
    }, 200, request, helpers.corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/sponsors") {
    return json({ ok:false, code:"PAYMENT_METHOD_DISABLED", payment_method:"PI" }, 410, request, helpers.corsHeaders);
  }

  return await listSponsors(request, env, helpers, url)
    || await createSponsorPayment(request, env, helpers, url)
    || await processSponsorPayment(request, env, helpers, url)
    || await cancelSponsorPayment(request, env, helpers, url)
    || await sponsorImage(request, env, helpers, url)
    || await trackSponsor(request, env, helpers, url)
    || null;
}
