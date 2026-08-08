const PI_USD_FALLBACK = 0.07499;
const CATALOG_VERSION = "2026-07-fixed-v1";
const RECOMMENDED_PACK_ID = "PI_2";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.81:3000",
  "https://192.168.1.81:3000"
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

function toPi(usdCents, piUsdPrice = PI_USD_FALLBACK) {
  const usd = Math.max(0, Number(usdCents || 0)) / 100;
  const raw = usd / Math.max(0.0000001, Number(piUsdPrice || PI_USD_FALLBACK));
  return Number((Math.ceil((raw - Number.EPSILON) * 100) / 100).toFixed(2));
}

function buildCatalog() {
  const piUsdPrice = PI_USD_FALLBACK;
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
        extra_spins: pack.spins - previous.spins
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
    price_source: "manual_dev_fallback",
    price_fallback: true,
    price_updated_at: null,
    price_obtained_at: Date.now(),
    conversion: "USD / PI_USD, rounded_up_to_2_decimals",
    generated_at: Date.now(),
    packs
  };
}

export function routeLocalFastShop(request, env, url = new URL(request.url)) {
  if (env?.ENV !== "dev" || request.method !== "GET") return null;

  if (url.pathname === "/shop/flappycoin/pi-price") {
    return json(request, {
      ok: true,
      currency: "USD",
      pi_price: PI_USD_FALLBACK,
      source: "manual_dev_fallback",
      fallback: true,
      updated_at: null,
      obtained_at: Date.now(),
      cache_hit: true,
      cache_layer: "dev-fast-path",
      attempts: 0,
      errors: []
    });
  }

  if (
    url.pathname === "/shop/flappycoin/catalog" ||
    url.pathname === "/shop/flappycoin/prices" ||
    url.pathname === "/shop/catalog"
  ) {
    return json(request, buildCatalog());
  }

  return null;
}
