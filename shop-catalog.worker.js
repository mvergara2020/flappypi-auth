const PI_USD_FALLBACK = 0.07499;
const PI_PRICE_TTL_SECONDS = 10 * 60;
const PI_FALLBACK_TTL_SECONDS = 2 * 60;
const PI_REQUEST_TIMEOUT_MS = 3000;
const PI_MAX_PROVIDER_AGE_SECONDS = 30 * 60;

const COINGECKO_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price" +
  "?ids=pi-network" +
  "&vs_currencies=usd" +
  "&include_last_updated_at=true" +
  "&precision=full";

const SHARED_CACHE_KEY =
  "https://cache.flappypi.internal/shop/pi-usd-v3";

const CATALOG_VERSION = "2026-07-fixed-v1";
const RECOMMENDED_PACK_ID = "PI_2";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.81:3000",
  "https://192.168.1.81:3000",
  "https://qa.classic.flappypi.com",
  "https://classic.flappypi.com"
]);

const PACKS = Object.freeze([
  { id:"PI_0_5", product_code:"FC_3000", name:"STARTER", usd_cents:10, coins:3000, spins:1, badge:"TRY IT", featured:false, compare_to:null, group:"main", sort:10 },
  { id:"PI_1", product_code:"FC_7000", name:"SMALL", usd_cents:20, coins:7000, spins:3, badge:null, featured:false, compare_to:"PI_0_5", group:"main", sort:20 },
  { id:"PI_2", product_code:"FC_15000", name:"SMART PACK", usd_cents:30, coins:15000, spins:5, badge:"RECOMMENDED", featured:true, compare_to:"PI_1", group:"main", sort:30 },
  { id:"PI_5", product_code:"FC_40000", name:"POWER", usd_cents:70, coins:40000, spins:8, badge:"POWER VALUE", featured:false, compare_to:"PI_2", group:"main", sort:40 },
  { id:"PI_10", product_code:"FC_84000", name:"POPULAR", usd_cents:140, coins:84000, spins:12, badge:"POPULAR", featured:false, compare_to:"PI_5", group:"more", sort:50 },
  { id:"PI_25", product_code:"FC_225000", name:"PRO", usd_cents:350, coins:225000, spins:20, badge:"PRO VALUE", featured:false, compare_to:"PI_10", group:"more", sort:60 },
  { id:"PI_50", product_code:"FC_470000", name:"ULTRA", usd_cents:700, coins:470000, spins:35, badge:"ULTRA VALUE", featured:false, compare_to:"PI_25", group:"more", sort:70 },
  { id:"PI_100", product_code:"FC_1000000", name:"MAX", usd_cents:1400, coins:1000000, spins:60, badge:"MAX VALUE", featured:false, compare_to:"PI_50", group:"max", sort:80 }
]);

let memoryPrice = null;
let refreshPromise = null;

function responseHeaders(request) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache"
  };

  const origin = request?.headers?.get?.("Origin") || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }

  return headers;
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(request)
  });
}

function isValidPiUsdPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 && price < 10000;
}

function readMemoryPrice() {
  if (!memoryPrice) return null;
  if (Date.now() >= memoryPrice.expires_at_ms) {
    memoryPrice = null;
    return null;
  }

  return {
    ...memoryPrice.value,
    cache_hit: true,
    cache_layer: "worker-memory"
  };
}

function saveMemoryPrice(value, ttlSeconds) {
  memoryPrice = {
    value,
    expires_at_ms: Date.now() + ttlSeconds * 1000
  };
}

async function readSharedPriceCache() {
  if (typeof caches === "undefined" || !caches.default) return null;

  try {
    const cache = caches.default;
    const key = new Request(SHARED_CACHE_KEY);
    const response = await cache.match(key);
    if (!response) return null;

    const data = await response.json();
    if (!isValidPiUsdPrice(data?.price_usd)) return null;

    if (Date.now() >= Number(data?.cache_expires_at || 0)) {
      await cache.delete(key).catch(() => {});
      return null;
    }

    const value = {
      ...data,
      cache_hit: true,
      cache_layer: "cloudflare-cache"
    };

    delete value.cache_expires_at;
    return value;
  } catch (error) {
    console.warn("[PI PRICE] shared cache read failed", String(error?.message || error));
    return null;
  }
}

async function saveSharedPriceCache(value, ttlSeconds) {
  if (typeof caches === "undefined" || !caches.default) return;

  try {
    const cache = caches.default;
    const key = new Request(SHARED_CACHE_KEY);
    const cacheValue = {
      ...value,
      cache_expires_at: Date.now() + ttlSeconds * 1000
    };

    await cache.put(key, new Response(JSON.stringify(cacheValue), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${ttlSeconds}`
      }
    }));
  } catch (error) {
    console.warn("[PI PRICE] shared cache write failed", String(error?.message || error));
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchPiPriceFromCoinGecko(env) {
  const apiKey = String(env?.COINGECKO_DEMO_API_KEY || "").trim();
  const headers = { "Accept": "application/json" };

  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  const response = await fetchWithTimeout(
    COINGECKO_PRICE_URL,
    {
      method: "GET",
      headers,
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
          "200-299": PI_PRICE_TTL_SECONDS,
          "400-499": 0,
          "500-599": 0
        }
      }
    },
    PI_REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`COINGECKO_HTTP_${response.status}: ${body.slice(0, 240)}`);
  }

  const data = await response.json();
  const piData = data?.["pi-network"];
  const price = Number(piData?.usd);
  const updatedAt = Number(piData?.last_updated_at || 0);

  if (!isValidPiUsdPrice(price)) {
    throw new Error("COINGECKO_INVALID_PI_PRICE");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    updatedAt > 0 &&
    nowSeconds - updatedAt > PI_MAX_PROVIDER_AGE_SECONDS
  ) {
    throw new Error("COINGECKO_STALE_PI_PRICE");
  }

  return {
    price_usd: price,
    source: apiKey ? "coingecko-demo" : "coingecko-public",
    updated_at: updatedAt || null,
    fallback: false,
    cache_hit: false,
    cache_layer: "provider",
    obtained_at: Date.now(),
    attempts: 1,
    errors: []
  };
}

async function refreshPiPrice(env) {
  const errors = [];

  try {
    const result = await fetchPiPriceFromCoinGecko(env);
    saveMemoryPrice(result, PI_PRICE_TTL_SECONDS);
    await saveSharedPriceCache(result, PI_PRICE_TTL_SECONDS);
    return result;
  } catch (error) {
    const message = String(error?.message || error);
    errors.push(message);
    console.warn("[PI PRICE] CoinGecko failed; using manual fallback", message);
  }

  const fallback = {
    price_usd: PI_USD_FALLBACK,
    source: "manual-fallback",
    updated_at: null,
    fallback: true,
    cache_hit: false,
    cache_layer: "fallback",
    obtained_at: Date.now(),
    attempts: 1,
    errors
  };

  saveMemoryPrice(fallback, PI_FALLBACK_TTL_SECONDS);
  await saveSharedPriceCache(fallback, PI_FALLBACK_TTL_SECONDS);
  return fallback;
}

async function getPiPriceUsd(env) {
  const memory = readMemoryPrice();
  if (memory) return memory;

  const shared = await readSharedPriceCache();
  if (shared) {
    const ttl = shared.fallback === true
      ? PI_FALLBACK_TTL_SECONDS
      : PI_PRICE_TTL_SECONDS;
    saveMemoryPrice(shared, ttl);
    return shared;
  }

  if (!refreshPromise) {
    refreshPromise = refreshPiPrice(env).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function toPi(usdCents, piUsdPrice) {
  const usd = Math.max(0, Number(usdCents || 0)) / 100;
  const raw = usd / Math.max(0.0000001, Number(piUsdPrice));
  return Number((Math.ceil((raw - Number.EPSILON) * 100) / 100).toFixed(2));
}

function buildCatalog(piPriceData) {
  const piUsdPrice = Number(piPriceData.price_usd);
  const starter = PACKS[0];
  const starterCoinsPerUsd = starter.coins / (starter.usd_cents / 100);

  const converted = PACKS.map(pack => {
    const usdPrice = Number((pack.usd_cents / 100).toFixed(2));
    const amountPi = toPi(pack.usd_cents, piUsdPrice);
    const coinsPerUsd = pack.coins / usdPrice;
    const valueBonusPct = Math.max(0, Math.round(((coinsPerUsd / starterCoinsPerUsd) - 1) * 100));

    return {
      id: pack.id,
      product_code: pack.product_code,
      name: pack.name,
      usd_cents: pack.usd_cents,
      usd_price: usdPrice,
      amount_pi: amountPi,
      coins: pack.coins,
      spins: pack.spins,
      badge: pack.badge,
      featured: pack.featured,
      compare_to: pack.compare_to,
      group: pack.group,
      sort: pack.sort,
      coins_per_usd: Math.round(coinsPerUsd),
      value_bonus_pct: valueBonusPct
    };
  });

  const byId = new Map(converted.map(pack => [pack.id, pack]));
  const packs = converted.map(pack => {
    const previous = pack.compare_to ? byId.get(pack.compare_to) : null;
    if (!previous) return { ...pack, upsell: null };

    return {
      ...pack,
      upsell: {
        compared_to: previous.id,
        compared_to_name: previous.name,
        extra_usd: Number((pack.usd_price - previous.usd_price).toFixed(2)),
        extra_pi: Number((pack.amount_pi - previous.amount_pi).toFixed(2)),
        extra_coins: pack.coins - previous.coins,
        extra_spins: pack.spins - previous.spins,
        price_increase_pct: Math.round(((pack.usd_price / previous.usd_price) - 1) * 100),
        coins_increase_pct: Math.round(((pack.coins / previous.coins) - 1) * 100)
      }
    };
  });

  return {
    ok: true,
    catalog_version: CATALOG_VERSION,
    recommended_pack_id: RECOMMENDED_PACK_ID,
    base_currency: "USD",
    payment_currency: "PI",
    pi_usd_price: piUsdPrice,
    price_source: piPriceData.source,
    price_fallback: piPriceData.fallback === true,
    price_updated_at: piPriceData.updated_at ?? null,
    price_obtained_at: piPriceData.obtained_at ?? Date.now(),
    price_cache_hit: piPriceData.cache_hit === true,
    price_cache_layer: piPriceData.cache_layer || null,
    price_attempts: Number(piPriceData.attempts || 1),
    price_errors: Array.isArray(piPriceData.errors) ? piPriceData.errors : [],
    conversion: "USD / PI_USD, rounded_up_to_2_decimals",
    conversion_formula: "USD / PI_USD, rounded_up_to_2_decimals",
    generated_at: Date.now(),
    packs
  };
}

export async function routeShopCatalog(request, env, url = new URL(request.url)) {
  if (request.method !== "GET") return null;

  const isPriceRoute = url.pathname === "/shop/flappycoin/pi-price";
  const isCatalogRoute =
    url.pathname === "/shop/flappycoin/catalog" ||
    url.pathname === "/shop/flappycoin/prices" ||
    url.pathname === "/shop/catalog";

  if (!isPriceRoute && !isCatalogRoute) return null;

  const piPrice = await getPiPriceUsd(env);

  if (isPriceRoute) {
    return json(request, {
      ok: true,
      currency: "USD",
      pi_price: piPrice.price_usd,
      source: piPrice.source,
      fallback: piPrice.fallback === true,
      updated_at: piPrice.updated_at ?? null,
      obtained_at: piPrice.obtained_at ?? Date.now(),
      cache_hit: piPrice.cache_hit === true,
      cache_layer: piPrice.cache_layer || null,
      attempts: Number(piPrice.attempts || 1),
      errors: Array.isArray(piPrice.errors) ? piPrice.errors : []
    });
  }

  return json(request, buildCatalog(piPrice));
}
