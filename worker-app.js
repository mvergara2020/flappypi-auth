import coreWorker from "./worker-entry.js";

const EXTRA_ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.81:3000",
  "https://192.168.1.81:3000",
  "https://qa.classic.flappypi.com",
  "https://classic.flappypi.com"
]);

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

function rewriteAlias(request) {
  const url = new URL(request.url);

  /* Frontend platform layer uses a compact generic alias. */
  if (request.method === "GET" && url.pathname === "/shop/catalog") {
    url.pathname = "/shop/flappycoin/catalog";
    return new Request(url.toString(), request);
  }

  return request;
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
    /*
      Terminal completion is accepted even though there is no stage 1000.
      `terminal=true` lets UI distinguish this from a normal unlock.
    */
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
    const sourceUrl = new URL(request.url);

    /*
      During intermission/after the season, old rewards may still be
      claimable but the expired pass itself is no longer for sale.
      Upcoming/active seasons remain purchasable.
    */
    if (
      request.method === "POST" &&
      sourceUrl.pathname === "/season/pass/pi-create"
    ) {
      const season = await getSeasonState(request, env, ctx);

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
    let response = await coreWorker.fetch(routedRequest, env, ctx);

    if (
      request.method === "POST" &&
      sourceUrl.pathname === "/game/finish"
    ) {
      response = await rewriteFingerTerminalResponse(request, response);
    }

    return withCors(request, response);
  },

  async queue(batch, env, ctx) {
    return coreWorker.queue(batch, env, ctx);
  }
};
