import {
  buildArenaRewardForRank,
  getRankBundle,
  RANK_LEVELS
} from "./levels.js";
import { routeDailyRewards } from "./daily-rewards.worker.js";
import { routeGamePhoto } from "./game-photo.worker.js";

//const FRONTEND_ORIGIN = "http://localhost:3000";
const FRONTEND_ORIGIN = "http://192.168.1.81:3000";
//var FRONTEND_ORIGIN = "https://qa.classic.flappypi.com";
//var FRONTEND_ORIGIN = "https://classic.flappypi.com";
const allowedColors = ["yellow", "red", "diamond", "black", "dragon-green", "dragon-blue", "dragon-red", "dragon-black"];
const BASE_BIRDS = ["yellow", "red", "diamond", "black"];

/* =========================================================
   FLAPPYCOIN SHOP CONFIG
========================================================= */

/*
  Precio manual actual:

  1 PI = US$0.07499

  Cuando quieras actualizar el precio de PI,
  solamente debes modificar esta variable.
*/
/* =========================================================
   PI PRICE CONFIG
========================================================= */

/*
  Respaldo manual final.

  Si CoinGecko falla después de los reintentos,
  el shop utilizará este valor.
*/
const PI_USD_PRICE = 0.07499;
const PI_PRICE_FALLBACK_USD = PI_USD_PRICE;

/*
  CoinGecko y Cloudflare cachearán el resultado
  durante 10 minutos.
*/
const PI_PRICE_CACHE_TTL_SECONDS = 10 * 60;

/*
  Cuando usamos el respaldo manual, solamente lo guardamos
  por 60 segundos para volver a intentar CoinGecko pronto.
*/
const PI_PRICE_FALLBACK_CACHE_TTL_SECONDS = 120;

const PI_PRICE_REQUEST_TIMEOUT_MS = 5000;
const PI_PRICE_RETRY_DELAY_MS = 350;
const PI_PRICE_MAX_ATTEMPTS = 2;

/*
  Rechazamos un precio de CoinGecko si su timestamp
  tiene más de 30 minutos.
*/
const PI_PRICE_MAX_PROVIDER_AGE_SECONDS = 30 * 60;

/*
  El scraping queda disponible, pero desactivado.

  false:
  CoinGecko API -> reintento -> precio manual.

  true:
  CoinGecko API -> reintento -> scraping -> precio manual.
*/
const PI_PRICE_ENABLE_HTML_SCRAPE_FALLBACK = true;

const PI_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price" +
  "?ids=pi-network" +
  "&vs_currencies=usd" +
  "&include_last_updated_at=true" +
  "&precision=full";

const PI_PRICE_PAGE_URL =
  "https://www.coingecko.com/en/coins/pi-network";

/*
  Caché adicional dentro del Worker.

  Este valor puede sobrevivir entre solicitudes mientras
  el mismo isolate de Cloudflare continúe activo.
*/
let piPriceMemoryCache = null;

const FLAPPYCOIN_CATALOG_VERSION = "2026-07-fixed-v1";

/*
  Conservamos los IDs antiguos PI_0_5, PI_1, PI_2, etc.
  para no romper el sistema de compra que ya tienes.

  Esos IDs ahora son solamente identificadores internos.
  El precio real se calcula usando usd_cents.
*/
const FLAPPYCOIN_RECOMMENDED_PACK_ID = "PI_2";

const FLAPPYCOIN_PACKS = Object.freeze([
  {
    id: "PI_0_5",
    product_code: "FC_3000",
    name: "STARTER",
    usd_cents: 10,
    coins: 3000,
    spins: 1,
    badge: "TRY IT",
    featured: false,
    compare_to: null,
    group: "main",
    sort: 10,
    enabled: true
  },
  {
    id: "PI_1",
    product_code: "FC_7000",
    name: "SMALL",
    usd_cents: 20,
    coins: 7000,
    spins: 3,
    badge: null,
    featured: false,
    compare_to: "PI_0_5",
    group: "main",
    sort: 20,
    enabled: true
  },
  {
    id: "PI_2",
    product_code: "FC_15000",
    name: "SMART PACK",
    usd_cents: 30,
    coins: 15000,
    spins: 5,
    badge: "RECOMMENDED",
    featured: true,
    compare_to: "PI_1",
    group: "main",
    sort: 30,
    enabled: true
  },
  {
    id: "PI_5",
    product_code: "FC_40000",
    name: "POWER",
    usd_cents: 70,
    coins: 40000,
    spins: 8,
    badge: "POWER VALUE",
    featured: false,
    compare_to: "PI_2",
    group: "main",
    sort: 40,
    enabled: true
  },
  {
    id: "PI_10",
    product_code: "FC_84000",
    name: "POPULAR",
    usd_cents: 140,
    coins: 84000,
    spins: 12,
    badge: "POPULAR",
    featured: false,
    compare_to: "PI_5",
    group: "more",
    sort: 50,
    enabled: true
  },
  {
    id: "PI_25",
    product_code: "FC_225000",
    name: "PRO",
    usd_cents: 350,
    coins: 225000,
    spins: 20,
    badge: "PRO VALUE",
    featured: false,
    compare_to: "PI_10",
    group: "more",
    sort: 60,
    enabled: true
  },
  {
    id: "PI_50",
    product_code: "FC_470000",
    name: "ULTRA",
    usd_cents: 700,
    coins: 470000,
    spins: 35,
    badge: "ULTRA VALUE",
    featured: false,
    compare_to: "PI_25",
    group: "more",
    sort: 70,
    enabled: true
  },
  {
    id: "PI_100",
    product_code: "FC_1000000",
    name: "MAX",
    usd_cents: 1400,
    coins: 1000000,
    spins: 60,
    badge: "MAX VALUE",
    featured: false,
    compare_to: "PI_50",
    group: "max",
    sort: 80,
    enabled: true
  }
]);

const ADMIN_USER_IDS = new Set([
  "d8977183-c4b0-489e-b6a7-1d3d5007f878",
  // agrega más ids aquí
]);

function isAdminUser(env, userId) {
  return ADMIN_USER_IDS.has(String(userId));
}
const CURRENT_SEASON_ID = "S5";

const RAFFLE_EGG_PACKS = {
  BRONZE: {
    pi: 0.5,
    tickets: 1,
    coins: 1500,
    shields: 0,
    spins: 1
  },
  GOLD: {
    pi: 2,
    tickets: 5,
    coins: 7500,
    shields: 1,
    spins: 2
  },
  DIAMOND: {
    pi: 4,
    tickets: 12,
    coins: 18000,
    shields: 2,
    spins: 3
  }
};

const RAFFLE_JACKPOT_RATE = 0.70;
const DUEL_CONFIG = {
  mode: "test", // "test" | "prod"

  platform_fee_rate: 0.15,

  entry_tiers: {
    test: [1, 1.5, 1.9, 1.20, 1.30, 1.55, 1.75, 1.99, 1.15, 1.22, 1.555, 1.111],
    prod: [1, 5, 10, 20, 30, 50, 75, 100, 150, 200, 500, 1000]
  },

  max_open_duels_per_user: {
    test: 20,
    prod: 3
  },

  expiration_hours: {
    test: 24,
    prod: 72
  }
};

const BIRD_SHIELDS = {
  yellow: 1,
  red: 1,
  diamond: 1,
  black: 1,
  "dragon-green": 2,
  "dragon-blue": 2, 
  "dragon-red": 2,
  "dragon-black": 2
};
//const FREE_EGG_COOLDOWN = 8 * 60 * 60 * 1000; // 8 horas
const LEVEL_TARGET = 100; //total tubos
const MAX_LEVEL_CAP = 999;
const MIN_BASE_SEC = 5;
const MIN_SEC_PER_PIPE = 0.35;
const MAX_SCORE_PER_SEC = 3;

/* =========================================================
   FLAPPY CLASSIC SCORING
   1 tubo real superado = 1 punto oficial
========================================================= */

function makeGame(config) {
  return Object.freeze({
    engine: "client_score",
    scoringVersion: "score-v1",
    metricName: "score",
    metricFields: ["score"],
    pointsPerUnit: 1,
    maxLevel: 999,
    specialLevels: [0],
    maxScorePerSec: 100,
    completionValidator: "none",
    levelProgression: false,
    levelRewardEnabled: false,
    ...config
  });
}

const FLAPPY_PIPE_RULES = {
  engine: "counter",
  metricName: "pipes_passed",
  metricFields: ["pipes_passed", "difficulty_pipes_passed"],
  pointsPerUnit: 1,
  maxScorePerSec: 3
};

const GAME_DEFINITIONS = Object.freeze({
  legacy: makeGame({
    scoringVersion: "legacy-v1",
    maxLevel: 99999,
    maxScorePerSec: 1000
  }),

  flappy_classic: makeGame({
    ...FLAPPY_PIPE_RULES,
    scoringVersion: "flappy-pipes-v1",
    maxLevel: 999,
    specialLevels: [0, 99999],
    completionValidator: "flappy_pipes",
    levelProgression: true,
    levelRewardEnabled: false
  }),

  webcam_flappy: makeGame({
    ...FLAPPY_PIPE_RULES,
    scoringVersion: "webcam-flappy-pipes-v1",
    maxLevel: 999,
    specialLevels: [0, 99999],
    completionValidator: "flappy_pipes",
    levelProgression: true,
    levelRewardEnabled: false
  }),

  flappypi_999: makeGame({
    ...FLAPPY_PIPE_RULES,
    scoringVersion: "flappypi-999-pipes-v1",
    maxLevel: 999
  }),

  finger_trace: makeGame({
    scoringVersion: "finger-trace-score-v1",
    maxLevel: 999,
    maxScorePerSec: 100
  }),

  jelly_fusion: makeGame({
    scoringVersion: "jelly-fusion-score-v1",
    maxLevel: 9999,
    maxScorePerSec: 150
  }),

  tetriz_999: makeGame({
    scoringVersion: "tetriz-999-score-v1",
    maxLevel: 999,
    maxScorePerSec: 150
  }),

  snake_999: makeGame({
    scoringVersion: "snake-999-score-v1",
    maxLevel: 999,
    maxScorePerSec: 100
  }),

  fusion_999: makeGame({
    scoringVersion: "fusion-999-score-v1",
    maxLevel: 999,
    maxScorePerSec: 150
  })
});

const GAME_ALIASES = Object.freeze({
  flappy: "flappy_classic",
  flappypi: "flappy_classic",
  webcam: "webcam_flappy",
  finger: "finger_trace",
  jelly: "jelly_fusion",
  tetriz: "tetriz_999",
  tetris: "tetriz_999",
  snake: "snake_999",
  fusion: "fusion_999"
});

function normalizeGameId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function getGameDefinition(value) {
  const normalized = normalizeGameId(value);
  const gameId = GAME_ALIASES[normalized] || normalized;
  const config = GAME_DEFINITIONS[gameId];

  return config ? { id: gameId, ...config } : null;
}

function normalizeGameLevel(value, game) {
  const level = Number(value);

  if (!Number.isInteger(level)) return 0;
  if (game.specialLevels.includes(level)) return level;
  if (level < 1 || level > game.maxLevel) return 0;

  return level;
}

function readGameMetric(game, body) {
  if (game.engine === "client_score") {
    return Number(body.score);
  }

  for (const field of game.metricFields) {
    if (body[field] !== undefined && body[field] !== null) {
      return Number(body[field]);
    }
  }

  return NaN;
}

function calculateOfficialGameScore(game, body) {
  const metric = readGameMetric(game, body);

  if (!Number.isInteger(metric) || metric < 0) {
    throw new Error("INVALID_GAME_METRIC");
  }

  return {
    metric,
    score: metric * game.pointsPerUnit
  };
}
/* =========================================================
   GAME POINTS QUEUE + SIGNED RECEIPTS
========================================================= */

const GAME_PROGRESS_RECEIPT_COOKIE = "fp_game_receipt";
const GAME_PROGRESS_RECEIPT_TTL_SECONDS = 8 * 60 * 60;
const GAME_PROGRESS_MAX_DURATION_SECONDS = 3 * 60 * 60;
const GAME_PROGRESS_TIME_GRACE_POINTS = 3;

function getCookieValue(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));

  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function makeGameProgressCookie(token, env) {
  const isProd = env.ENV !== "dev";

  const flags = isProd
    ? "HttpOnly; SameSite=None; Secure; Path=/"
    : "HttpOnly; SameSite=Lax; Path=/";

  return (
    `${GAME_PROGRESS_RECEIPT_COOKIE}=${encodeURIComponent(token)}; ` +
    `${flags}; Max-Age=${GAME_PROGRESS_RECEIPT_TTL_SECONDS}`
  );
}

function getGameMetricName(game) {
  return String(
    game.metricName ||
    game.metricFields?.[0] ||
    "score"
  );
}

function isPipeMetric(game) {
  return getGameMetricName(game) === "pipes_passed";
}

async function createGameProgressReceipt({
  env,
  userId,
  gameUid,
  game,
  seq = 0,
  acceptedMetric = 0,
  acceptedPoints = 0,
  lastServerAt = Date.now()
}) {
  const nowSec = Math.floor(Date.now() / 1000);

  return signJWT({
    type: "game_progress",
    sub: userId,
    game_uid: gameUid,
    game_type: game.id,
    scoring_version: game.scoringVersion,
    seq,
    accepted_metric: acceptedMetric,
    accepted_points: acceptedPoints,
    last_server_at: lastServerAt,
    iat: nowSec,
    exp: nowSec + GAME_PROGRESS_RECEIPT_TTL_SECONDS
  }, env.JWT_SECRET);
}

async function verifyGameProgressReceipt({
  env,
  token,
  userId,
  gameUid,
  game
}) {
  if (!token) {
    throw new Error("MISSING_PROGRESS_RECEIPT");
  }

  const receipt = await verifyJWT(
    token,
    env.JWT_SECRET
  );

  if (
    receipt.type !== "game_progress" ||
    receipt.sub !== userId ||
    receipt.game_uid !== gameUid ||
    receipt.game_type !== game.id ||
    receipt.scoring_version !== game.scoringVersion
  ) {
    throw new Error("INVALID_PROGRESS_RECEIPT");
  }

  const seq = Number(receipt.seq);
  const acceptedMetric = Number(
    receipt.accepted_metric
  );

  if (
    !Number.isInteger(seq) ||
    !Number.isInteger(acceptedMetric) ||
    seq < 0 ||
    acceptedMetric < 0
  ) {
    throw new Error(
      "INVALID_PROGRESS_RECEIPT_STATE"
    );
  }

  return receipt;
}

async function enqueueGameProgress({
  env,
  user,
  payload,
  game,
  receiptToken,
  cumulativeMetric,
  final = false
}) {
  const gameUid = String(
    payload.game_uid || ""
  );

  const startedAt = Number(
    payload.startedAt
  );

  const now = Date.now();

  if (
    !gameUid ||
    !Number.isFinite(startedAt)
  ) {
    throw new Error("INVALID_GAME_CONTEXT");
  }
  if (
    !Number.isInteger(cumulativeMetric) ||
    cumulativeMetric < 0
  ) {
    throw new Error("INVALID_GAME_METRIC");
  }

  const receipt =
    await verifyGameProgressReceipt({
      env,
      token: receiptToken,
      userId: user.id,
      gameUid,
      game
    });

  const previousMetric = Number(
    receipt.accepted_metric || 0
  );

  const previousPoints = Number(
    receipt.accepted_points || 0
  );

  const previousSeq = Number(
    receipt.seq || 0
  );

  if (cumulativeMetric < previousMetric) {
    throw new Error("GAME_METRIC_REGRESSION");
  }

  const durationSec =
    (now - startedAt) / 1000;

  if (
    !Number.isFinite(durationSec) ||
    durationSec < 0 ||
    durationSec >
      GAME_PROGRESS_MAX_DURATION_SECONDS
  ) {
    throw new Error("GAME_PROGRESS_EXPIRED");
  }

  const cumulativePoints =
    cumulativeMetric * game.pointsPerUnit;

  const maxAllowedPoints =
    Math.floor(
      durationSec * game.maxScorePerSec
    ) +
    GAME_PROGRESS_TIME_GRACE_POINTS;

  if (cumulativePoints > maxAllowedPoints) {
    throw new Error(
      "GAME_PROGRESS_TIME_ANOMALY"
    );
  }

  const deltaMetric =
    cumulativeMetric - previousMetric;

  const deltaPoints =
    cumulativePoints - previousPoints;

  /*
    No mandamos mensajes vacíos durante la partida.
    En finish sí mandamos el evento aunque el delta sea 0,
    porque debe marcar la sesión como finalizada.
  */
  if (
    deltaMetric === 0 &&
    final !== true
  ) {
    return {
      queued: false,
      final: false,
      seq: previousSeq,
      cumulativeMetric,
      cumulativePoints,
      deltaMetric: 0,
      deltaPoints: 0,
      receiptToken
    };
  }

  const nextSeq = previousSeq + 1;

  const progressEvent = {
    event_id:
      `${gameUid}:${nextSeq}:${final ? 1 : 0}`,

    user_id: user.id,
    game_uid: gameUid,
    game_type: game.id,

    scoring_version:
      game.scoringVersion,

    metric_name:
      getGameMetricName(game),

    seq: nextSeq,

    cumulative_metric:
      cumulativeMetric,

    cumulative_points:
      cumulativePoints,

    started_at:
      startedAt,

    server_received_at:
      now,

    final: final === true
  };

  let queued = false;
  let confirmed = false;

  const queueAvailable =
    !!env.GAME_POINTS_QUEUE &&
    typeof env.GAME_POINTS_QUEUE.send === "function";

  if (queueAvailable) {
    try {
      await env.GAME_POINTS_QUEUE.send(progressEvent);
      queued = true;
    } catch (error) {
      console.warn("[GAME POINTS QUEUE SEND FAILED]", {
        game_uid: gameUid,
        game_type: game.id,
        message: String(error?.message || error)
      });
    }
  }

  /*
    El finish confirma en D1 antes de responder.
    Si Queue no está disponible, los checkpoints también
    usan D1 como fallback para no perder PTS.

    consolidateGamePointsEvent() es idempotente por
    game_uid + métrica acumulada, por lo que el mensaje
    posterior de Queue no duplica puntos.
  */
  if (final === true || queued === false) {
    await consolidateGamePointsEvent(env, progressEvent);
    confirmed = true;
  }

  /*
    El nuevo recibo se genera solamente después de que
    Cloudflare acepta el mensaje en la Queue.
  */
  const nextReceiptToken =
    await createGameProgressReceipt({
      env,
      userId: user.id,
      gameUid,
      game,
      seq: nextSeq,
      acceptedMetric: cumulativeMetric,
      acceptedPoints: cumulativePoints,
      lastServerAt: now
    });

  return {
    queued,
    confirmed,
    final: final === true,
    seq: nextSeq,
    cumulativeMetric,
    cumulativePoints,
    deltaMetric,
    deltaPoints,
    receiptToken: nextReceiptToken
  };
}

async function applyGameLevelProgress({
  env,
  userId,
  game,
  payload,
  completeGameSafe
}) {
  const levelId = Number(
    payload.level_id
  );

  const mode = String(
    payload.mode || "infinity"
  );

  if (
    completeGameSafe !== true ||
    game.levelProgression !== true ||
    mode !== "levels" ||
    !Number.isInteger(levelId) ||
    levelId < 1 ||
    game.specialLevels.includes(levelId)
  ) {
    return {
      completed: completeGameSafe === true,
      advanced: false,
      completed_level: levelId,
      max_level_unlocked: null,
      next_level: null
    };
  }

  const current = await env.DB.prepare(`
    SELECT
      max_level_unlocked,
      last_selected_level
    FROM user_game_progress
    WHERE user_id = ?
      AND game_type = ?
  `).bind(
    userId,
    game.id
  ).first();

  const currentMax = Number(
    current?.max_level_unlocked || 1
  );

  if (levelId > currentMax) {
    throw new Error("LEVEL_NOT_UNLOCKED");
  }

  /*
    Solo avanza cuando termina exactamente el nivel
    máximo que tenía desbloqueado.
  */
  const advanced =
    levelId === currentMax &&
    currentMax < game.maxLevel;

  const nextMax = advanced
    ? currentMax + 1
    : currentMax;

  const nextSelected = advanced
    ? nextMax
    : Math.min(levelId, nextMax);

  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO user_game_progress (
      user_id,
      game_type,
      max_level_unlocked,
      last_selected_level,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?)

    ON CONFLICT(user_id, game_type)
    DO UPDATE SET
      max_level_unlocked = CASE
        WHEN excluded.max_level_unlocked >
          user_game_progress.max_level_unlocked
        THEN excluded.max_level_unlocked
        ELSE user_game_progress.max_level_unlocked
      END,

      last_selected_level =
        excluded.last_selected_level,

      updated_at =
        excluded.updated_at
  `).bind(
    userId,
    game.id,
    nextMax,
    nextSelected,
    now
  ).run();

  return {
    completed: true,
    advanced,
    completed_level: levelId,
    max_level_unlocked: nextMax,
    next_level: advanced
      ? nextMax
      : null
  };
}

async function createGameCompletionSpin(
  env,
  userId,
  gameUid,
  levelId
) {
  const spinId = crypto.randomUUID();

  const source = levelId
    ? `game_level_${levelId}`
    : "game";

  const now = Date.now();

  try {
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO spins (
          id,
          user_id,
          game_uid,
          status,
          reward_json,
          created_at,
          claimed_at,
          source
        )
        VALUES (
          ?, ?, ?, 'PENDING',
          NULL, ?, NULL, ?
        )
      `).bind(
        spinId,
        userId,
        gameUid,
        now,
        source
      ),

      env.DB.prepare(`
        UPDATE users
        SET free_spins = free_spins + 1
        WHERE id = ?
      `).bind(userId)
    ]);

    return true;
  } catch (error) {
    const message = String(
      error?.message || ""
    );

    /*
      Si game_uid ya generó el spin,
      no volvemos a entregarlo.
    */
    if (
      message.includes("UNIQUE") ||
      message.includes("constraint")
    ) {
      return false;
    }

    throw error;
  }
}

async function consolidateGamePointsEvent(
  env,
  event
) {
  const gameUid = String(
    event?.game_uid || ""
  );

  const userId = String(
    event?.user_id || ""
  );

  const game = getGameDefinition(
    event?.game_type
  );

  const incomingSeq = Number(
    event?.seq
  );

  const incomingMetric = Number(
    event?.cumulative_metric
  );

  const startedAt = Number(
    event?.started_at
  );

  const receivedAt = Number(
    event?.server_received_at ||
    Date.now()
  );

  const isFinal =
    event?.final === true;

  if (
    !gameUid ||
    !userId ||
    !game ||
    game.id === "legacy" ||
    event?.scoring_version !==
      game.scoringVersion ||
    !Number.isInteger(incomingSeq) ||
    !Number.isInteger(incomingMetric) ||
    incomingSeq < 1 ||
    incomingMetric < 0 ||
    !Number.isFinite(startedAt)
  ) {
    throw new Error(
      "INVALID_GAME_POINTS_EVENT"
    );
  }

  const session = await env.DB.prepare(`
      SELECT
        user_id,
        game_type,
        status,
        committed_seq,
        committed_metric,
        committed_points,
        finished_at
      FROM game_sessions
      WHERE game_uid = ?
  `).bind(gameUid).first();

  if (
    session &&
    (
      String(session.user_id) !== userId ||
      String(session.game_type) !== game.id
    )
  ) {
    throw new Error(
      "GAME_SESSION_OWNER_MISMATCH"
    );
  }

  const oldSeq = Number(
    session?.committed_seq || 0
  );

  const oldMetric = Number(
    session?.committed_metric || 0
  );

  const oldPoints = Number(
    session?.committed_points || 0
  );

  /*
    Nunca retrocedemos.
    Mensajes duplicados o desordenados no restan.
  */
  const newSeq = Math.max(
    oldSeq,
    incomingSeq
  );

  const newMetric = Math.max(
    oldMetric,
    incomingMetric
  );

  const newPoints =
    newMetric * game.pointsPerUnit;

  const deltaMetric = Math.max(
    0,
    newMetric - oldMetric
  );

  const deltaPoints = Math.max(
    0,
    newPoints - oldPoints
  );

  const wasFinished =
  session?.status === "finished";

const finishedAt = Number(
  session?.finished_at || 0
);

/*
  Un checkpoint generado antes del finish puede llegar
  tarde y sigue siendo válido.

  Un checkpoint creado después del finish se descarta.
*/
if (
  wasFinished &&
  finishedAt > 0 &&
  receivedAt > finishedAt
) {
  return;
}

const nextStatus =
  wasFinished || isFinal
    ? "finished"
    : "active";

  const firstFinal =
    isFinal && !wasFinished;

  const bestScoreCandidate =
    nextStatus === "finished"
      ? newPoints
      : 0;

  const pipeDelta =
    isPipeMetric(game)
      ? deltaMetric
      : 0;

  if (
    deltaMetric === 0 &&
    deltaPoints === 0 &&
    firstFinal === false &&
    newSeq === oldSeq
  ) {
    return;
  }

  /*
    Un solo batch:
    1. Actualiza estado de la partida.
    2. Suma únicamente el delta permanente.
  */
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO game_sessions (
        game_uid,
        user_id,
        game_type,
        status,
        committed_seq,
        committed_metric,
        committed_points,
        started_at,
        updated_at,
        finished_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )

      ON CONFLICT(game_uid)
      DO UPDATE SET
        status = excluded.status,

        committed_seq = CASE
          WHEN excluded.committed_seq >
            game_sessions.committed_seq
          THEN excluded.committed_seq
          ELSE game_sessions.committed_seq
        END,

        committed_metric = CASE
          WHEN excluded.committed_metric >
            game_sessions.committed_metric
          THEN excluded.committed_metric
          ELSE game_sessions.committed_metric
        END,

        committed_points = CASE
          WHEN excluded.committed_points >
            game_sessions.committed_points
          THEN excluded.committed_points
          ELSE game_sessions.committed_points
        END,

        updated_at =
          excluded.updated_at,

        finished_at = CASE
          WHEN excluded.status = 'finished'
          THEN COALESCE(
            game_sessions.finished_at,
            excluded.finished_at
          )
          ELSE game_sessions.finished_at
        END
    `).bind(
      gameUid,
      userId,
      game.id,
      nextStatus,
      newSeq,
      newMetric,
      newPoints,
      startedAt,
      receivedAt,
      nextStatus === "finished"
        ? receivedAt
        : null
    ),

    env.DB.prepare(`
      INSERT INTO user_game_stats (
        user_id,
        game_type,
        total_points,
        season_points,
        season_id,
        best_score,
        total_pipes,
        games_played,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

      ON CONFLICT(user_id, game_type)
      DO UPDATE SET
        total_points =
          user_game_stats.total_points +
          excluded.total_points,

        season_points = CASE
          WHEN user_game_stats.season_id =
            excluded.season_id
          THEN
            user_game_stats.season_points +
            excluded.season_points
          ELSE
            excluded.season_points
        END,

        season_id =
          excluded.season_id,

        best_score = CASE
          WHEN excluded.best_score >
            user_game_stats.best_score
          THEN excluded.best_score
          ELSE user_game_stats.best_score
        END,

        total_pipes =
          user_game_stats.total_pipes +
          excluded.total_pipes,

        games_played =
          user_game_stats.games_played +
          excluded.games_played,

        updated_at =
          excluded.updated_at
    `).bind(
      userId,
      game.id,
      deltaPoints,
      deltaPoints,
      CURRENT_SEASON_ID,
      bestScoreCandidate,
      pipeDelta,
      firstFinal ? 1 : 0,
      receivedAt
    )
  ]);
}

async function consumeGamePointsBatch(
  batch,
  env
) {
  const groups = new Map();

  for (const message of batch.messages) {
    const event = message.body;

    const gameUid = String(
      event?.game_uid || ""
    );

    if (!gameUid) {
      message.ack();
      continue;
    }

    let group = groups.get(gameUid);

    if (!group) {
      group = {
        messages: [],
        events: []
      };

      groups.set(gameUid, group);
    }

    group.messages.push(message);
    group.events.push({
      ...event
    });
  }

  for (const group of groups.values()) {
    try {
      const finalEvents =
        group.events.filter(
          event => event?.final === true
        );

      const finalAt = finalEvents.length
        ? Math.min(
            ...finalEvents.map(event =>
              Number(
                event?.server_received_at ||
                Number.MAX_SAFE_INTEGER
              )
            )
          )
        : null;

      /*
        Si existe finish, solo consideramos los eventos
        creados hasta ese instante.
      */
      const eligibleEvents =
        finalAt !== null
          ? group.events.filter(event =>
              Number(
                event?.server_received_at || 0
              ) <= finalAt
            )
          : group.events;

      if (!eligibleEvents.length) {
        for (const message of group.messages) {
          message.ack();
        }

        continue;
      }

      let selected =
        eligibleEvents[0];

      for (
        let i = 1;
        i < eligibleEvents.length;
        i++
      ) {
        const candidate =
          eligibleEvents[i];

        const selectedMetric = Number(
          selected?.cumulative_metric || 0
        );

        const candidateMetric = Number(
          candidate?.cumulative_metric || 0
        );

        const selectedSeq = Number(
          selected?.seq || 0
        );

        const candidateSeq = Number(
          candidate?.seq || 0
        );

        if (
          candidateMetric > selectedMetric ||
          (
            candidateMetric ===
              selectedMetric &&
            candidateSeq > selectedSeq
          )
        ) {
          selected = candidate;
        }
      }

      const consolidatedEvent = {
        ...selected,

        final:
          finalAt !== null,

        server_received_at:
          finalAt !== null
            ? finalAt
            : Number(
                selected.server_received_at ||
                Date.now()
              )
      };

      await consolidateGamePointsEvent(
        env,
        consolidatedEvent
      );

      for (const message of group.messages) {
        message.ack();
      }
    } catch (error) {
      console.error(
        "[GAME POINTS QUEUE ERROR]",
        {
          game_uid:
            group.events?.[0]
              ?.game_uid || null,

          message:
            String(
              error?.message || error
            )
        }
      );

      for (const message of group.messages) {
        message.retry({
          delaySeconds: Math.min(
            300,
            5 * Number(
              message.attempts || 1
            )
          )
        });
      }
    }
  }
}
const EXTRA_ATTACKS_PER_PURCHASE = 2;
const EXTRA_ATTACK_COST = 600;
const MAX_EXTRA_PURCHASES_PER_DAY = 1;
const MAX_ATTACKS_DONE_PER_DAY = 10;
const MAX_ATTACKS_RECEIVED_PER_DAY = 10;
const MIN_FLAMES_TO_BE_ATTACKABLE = 50;
const MAX_STEAL = 75;

let DEV_PIPE_GAP = 1.04; //DEJAR EN 1 PARA PRODUCCIÓN ....

const FLAPPY_STAGE_TEMPLATES = {
  0:  { mode: "normal", label: "∞", isInfinity: true , pipes_target: 100},
  1:  { mode: "normal", estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 25},
  2:  { mode: "normal", estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 25},
  3:  { mode: "normal", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 25}, //x2
  4:  { mode: "normal", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 25}, //x2
  5:  { mode: "normal", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 25}, //x3
  6:  { mode: "normal", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 25}, //x3
  7:  { mode: "normal", estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 25},
  8:  { mode: "normal", estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 25},
  9:  { mode: "normal", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1 , pipes_target: 25}, //x2
  10: { mode: "normal", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1 , pipes_target: 25}, //x2
  11: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 30},
  12: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, pipes_target: 30},
  13: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1, pipes_target: 30}, //x2
  14: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1, pipes_target: 30}, //x2
  15: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1, pipes_target: 30}, //x3
  16: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1, pipes_target: 30}, //x3
  17: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 30},
  18: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, pipes_target: 30},
  19: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1, pipes_target: 30}, //x2
  20: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1, pipes_target: 30}, //x2
  21: { mode: "fade", estrecho: 0.84*DEV_PIPE_GAP, pipes_target: 50},
  22: { mode: "fade", estrecho: 0.84*DEV_PIPE_GAP, pipes_target: 50},
  23:  { mode: "fade", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50}, //x2
  24:  { mode: "fade", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50}, //x2
  25:  { mode: "fade", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50}, //x3
  26:  { mode: "fade", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50}, //x3
  27:  { mode: "fade", estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50},
  28:  { mode: "fade", estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50},
  29:  { mode: "fade", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1 , pipes_target: 50}, //x2
  30: { mode: "fade", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1 , pipes_target: 50}, //x2
  31: { mode: "fade_moving", estrecho: 0.84*DEV_PIPE_GAP, pipes_target: 50},
  32: { mode: "fade_moving", estrecho: 0.84*DEV_PIPE_GAP, pipes_target: 50},
  33:  { mode: "fade_moving", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50}, //x2
  34:  { mode: "fade_moving", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50}, //x2
  35:  { mode: "fade_moving", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50}, //x3
  36:  { mode: "fade_moving", vx: 1.1, estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50}, //x3
  37:  { mode: "fade_moving", estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50},
  38:  { mode: "fade_moving", estrecho: 0.84*DEV_PIPE_GAP , pipes_target: 50},
  39:  { mode: "fade_moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1 , pipes_target: 50}, //x2
  40: { mode: "fade_moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1 , pipes_target: 50}, //x2
  41: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, pipes_target: 80},
  42: { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, pipes_target: 80},
  43:  { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1 , pipes_target: 80}, //x2
  44:  { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1 , pipes_target: 80}, //x2
  45:  { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP,vx: 1.1 , pipes_target: 80}, //x3
  46:  { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP,vx: 1.1 , pipes_target: 100}, //x3
  47:  { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP,vx: 1.1 , pipes_target: 100},
  48:  { mode: "moving", estrecho: 0.84*DEV_PIPE_GAP,vx: 1.1 , pipes_target: 100},
  49:  { mode: "fade_moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1 , pipes_target: 100}, //x2
  50: { mode: "fade_moving", estrecho: 0.84*DEV_PIPE_GAP, vx: 1.1 , pipes_target: 100}, //x2
  /*2: { mode: "moving" },
  3: { mode: "fade" },
  4: { mode: "moving_x2" },
  5: { mode: "fade_moving" },
  6: { mode: "moving_x3" },
  7: { mode: "fade_moving_x2" },
  8: { mode: "fade_moving_x3" },*/

  // 🍼 BABY MODE
  99999: { 
    mode: "normal",
    label: "🍼",
    vx: 0.6,            // juego más lento
    baby: true          // flag especial
  }
};

/* =========================================================
   FLAPPY CLASSIC - 999 STAGES
   STAGE N requires N real pipes / official PTS.
   Mechanics reuse the original 50-stage templates cyclically.
========================================================= */
function buildFlappyClassicStages(maxStage = 999) {
  const stages = {};

  for (let stage = 1; stage <= maxStage; stage++) {
    const templateStage = ((stage - 1) % 50) + 1;
    const template = FLAPPY_STAGE_TEMPLATES[templateStage] || FLAPPY_STAGE_TEMPLATES[1];

    stages[stage] = Object.freeze({
      ...template,
      pipes_target: stage,
      stage_id: stage,
      template_stage: templateStage
    });
  }

  stages[0] = Object.freeze({ ...FLAPPY_STAGE_TEMPLATES[0] });
  stages[99999] = Object.freeze({ ...FLAPPY_STAGE_TEMPLATES[99999] });

  return Object.freeze(stages);
}

const LEVEL_DEFINITION = buildFlappyClassicStages(999);

function getEffectivePiAmount(amount, env) {
  if (env.ENV === "dev" || env.ENV === "qa") {
    return Math.max(0.01, Number((amount * 0.01).toFixed(2)));
  }

  return Number(amount);
}

function calcRaffleCart(cart) {
  const cleanCart = {
    BRONZE: Math.max(0, Math.min(20, Number(cart?.BRONZE || 0))),
    GOLD: Math.max(0, Math.min(20, Number(cart?.GOLD || 0))),
    DIAMOND: Math.max(0, Math.min(20, Number(cart?.DIAMOND || 0)))
  };

  let totalPi = 0;
  let tickets = 0;
  let coins = 0;
  let shields = 0;
  let spins = 0;
  let qty = 0;

  for (const packId of Object.keys(cleanCart)) {
    const pack = RAFFLE_EGG_PACKS[packId];
    const count = cleanCart[packId];

    if (!pack || count <= 0) continue;

    totalPi += pack.pi * count;
    tickets += pack.tickets * count;
    coins += pack.coins * count;
    shields += pack.shields * count;
    spins += pack.spins * count;
    qty += count;
  }

  return {
    cart: cleanCart,
    qty,
    totalPi: Number(totalPi.toFixed(2)),
    tickets,
    coins,
    shields,
    spins
  };
}

const DUEL_PLATFORM_FEE_RATE = 0.15;
const DUEL_CREATE_COOLDOWN_MS = 60 * 1000;
const DUEL_EXPIRE_HOURS = 72;

const BOOST_SHOP = {
  // 🟢 1 HOUR
  BOOST_X3_HOUR: {
    id: "BOOST_X3_HOUR",
    multiplier: 3,
    duration_ms: 60 * 60 * 1000,
    cost_eggs: 1000
  },
  BOOST_X5_HOUR: {
    id: "BOOST_X5_HOUR",
    multiplier: 5,
    duration_ms: 60 * 60 * 1000,
    cost_eggs: 2000
  },

  // 🔵 1 DAY
  BOOST_X3_DAY: {
    id: "BOOST_X3_DAY",
    multiplier: 3,
    duration_ms: 24 * 60 * 60 * 1000,
    cost_eggs: 2500
  },
  BOOST_X5_DAY: {
    id: "BOOST_X5_DAY",
    multiplier: 5,
    duration_ms: 24 * 60 * 60 * 1000,
    cost_eggs: 4000
  },

  // 🔴 1 WEEK (premium)
  BOOST_X8_WEEK: {
    id: "BOOST_X8_WEEK",
    multiplier: 8,
    duration_ms: 7 * 24 * 60 * 60 * 1000,
    cost_eggs: 15000
  }
};

function getRankLevelByNumber(rankNumber) {
  const rank = Math.max(1,Math.min(RANK_LEVELS.length,Number(rankNumber) || 1));
  return RANK_LEVELS[rank - 1];
}
function getActiveBoostRow(row) {
  if (!row) return null;
  if (!row.boost_multiplier || !row.boost_expires_at) return null;
  if (Date.now() >= Number(row.boost_expires_at)) return null;

  return {
    multiplier: Number(row.boost_multiplier),
    expires_at: Number(row.boost_expires_at),
    source: row.boost_source || null
  };
}

function makeDuelPublicId() {
  const rnd = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `DUEL-${rnd}`;
}

function mapDevDuelEntry(entryTier, env) {
  const entry = Number(entryTier);

  if (env.ENV !== "dev" && env.ENV !== "qa") {
    return entry;
  }

  const devMap = {
    20: 1,
    50: 2,
    100: 3,
    200: 5,
    500: 8,
    1000: 10
  };

  return devMap[entry] ?? 1;
}

function buildDuelEconomy(entryTier, env) {
  const nominalEntryTier = Number(entryTier);
  const effectiveEntryTier = mapDevDuelEntry(nominalEntryTier, env);

  const totalPot = effectiveEntryTier * 2;
  const platformFee = totalPot * DUEL_PLATFORM_FEE_RATE;
  const winnerReward = totalPot - platformFee;

  return {
    nominal_entry_tier_pi: nominalEntryTier,
    effective_entry_tier_pi: effectiveEntryTier,
    total_pot_pi: totalPot,
    platform_fee_rate: DUEL_PLATFORM_FEE_RATE,
    platform_fee_pi: platformFee,
    winner_reward_pi: winnerReward
  };
}

function isValidNominalDuelEntryTier(entryTier) {
  return [1, 5, 10, 20, 30, 50, 75, 100, 150, 200, 500, 1000].includes(Number(entryTier));
}

function isValidArenaSetup(arenaSetup) {
  if (!arenaSetup || typeof arenaSetup !== "object") return false;

  const chicks = Array.isArray(arenaSetup.chicks) ? arenaSetup.chicks : [];
  const rockets = Array.isArray(arenaSetup.rockets) ? arenaSetup.rockets : [];

  if (chicks.length !== 3) return false;
  if (rockets.length <= 0) return false;

  return true;
}

async function insertDuelEventAndFeed(env, duelId, eventType, actorUserId, eventJson = null) {
  await insertDuelEvent(env, duelId, eventType, actorUserId, eventJson);

  let activityType = null;
  let priority = 1;

  if (eventType === "duel_created") {
    activityType = "duel_created";
    priority = 2;
  } else if (eventType === "duel_joined") {
    activityType = "duel_joined";
    priority = 2;
  } else if (eventType === "duel_resolved" || eventType === "duel_won") {
    activityType = "duel_won";
    priority = 4;
  }

  if (!activityType) return;

  await insertActivityFeed(env, {
    activityType,
    actorUserId,
    targetUserId: null,
    referenceTable: "duel_events",
    referenceId: duelId,
    payload: eventJson,
    priority
  });
}

async function insertActivityFeed(
  env,
  {
    activityType,
    actorUserId = null,
    targetUserId = null,
    referenceTable = null,
    referenceId = null,
    payload = null,
    priority = 0,
    visible = 1,
    createdAt = null
  }
) {
  const ts = createdAt || Math.floor(Date.now() / 1000);

  await env.DB.prepare(`
    INSERT INTO activity_feed (
      activity_type,
      actor_user_id,
      target_user_id,
      reference_table,
      reference_id,
      payload_json,
      visible,
      priority,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    activityType,
    actorUserId,
    targetUserId,
    referenceTable,
    referenceId,
    payload ? JSON.stringify(payload) : null,
    visible,
    priority,
    ts
  ).run();
}

async function releaseExpiredDuelReservations(env) {
  await env.DB.prepare(`
    UPDATE duels
    SET
      status = 'open',
      challenger_user_id = NULL,
      challenger_setup_json = NULL,
      reserved_at = NULL,
      reserve_expires_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE status = 'reserved'
      AND reserve_expires_at IS NOT NULL
      AND reserve_expires_at <= datetime('now')
  `).run();
}
async function userHasActiveDuelReservation(env, userId) {
  const row = await env.DB.prepare(`
    SELECT id
    FROM duels
    WHERE challenger_user_id = ?
      AND status = 'reserved'
      AND reserve_expires_at IS NOT NULL
      AND reserve_expires_at > datetime('now')
    LIMIT 1
  `).bind(userId).first();

  return !!row;
}

async function assertDuelCreateCooldown(env, userId) {
  const row = await env.DB.prepare(`
    SELECT created_at, status
    FROM duels
    WHERE creator_user_id = ?
      AND status IN ('payment_pending', 'reserved', 'locked', 'resolved')
    ORDER BY id DESC
    LIMIT 1
  `).bind(userId).first();

  if (!row?.created_at) {
    return { ok: true };
  }

  const lastCreatedAt = new Date(row.created_at).getTime();
  const now = Date.now();
  const diff = now - lastCreatedAt;

  if (diff < DUEL_CREATE_COOLDOWN_MS) {
    return {
      ok: false,
      retry_after_ms: DUEL_CREATE_COOLDOWN_MS - diff
    };
  }

  return { ok: true };
}

async function insertDuelEvent(env, duelId, eventType, actorUserId, eventJson = null) {
  await env.DB.prepare(`
    INSERT INTO duel_events (duel_id, event_type, actor_user_id, event_json)
    VALUES (?, ?, ?, ?)
  `).bind(
    duelId,
    eventType,
    actorUserId || null,
    eventJson ? JSON.stringify(eventJson) : null
  ).run();
}

function cacheKey(path) {
  return new Request(`https://cache.flappypi/${path}`);
}

function makeTid(prefix = "rv") {
  const rnd = new Uint8Array(16);
  crypto.getRandomValues(rnd);
  const hex = [...rnd].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${Date.now()}_${hex}`;
}

async function readJsonSafe(request) {
  try { return await request.json(); } catch { return null; }
}

/* =========================
   SPIN CONFIG
   (suma 100)
========================= */
const SPIN_TABLE_V2 = Object.freeze({
  version: "v2",
  items: Object.freeze([
    { type: "eggs", amount: 100, weight: 44 },
    { type: "eggs", amount: 200, weight: 33 },
    { type: "eggs", amount: 300, weight: 20 },
    { type: "eggs", amount: 400, weight: 2 },
    { type: "eggs", amount: 500, weight: 1 }
  ])
});

function cryptoRandInt(maxExclusive) {
  // maxExclusive debe ser > 0
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % maxExclusive;
}

function rollSpin(table = SPIN_TABLE_V2) {
  const items = table.items;

  const total = items.reduce((acc, it) => acc + (it.weight || 0), 0);
  if (total <= 0) throw new Error("SPIN_TABLE_INVALID_TOTAL");

  const r = cryptoRandInt(total);
  let acc = 0;

  for (const it of items) {
    acc += it.weight;
    if (r < acc) {
      // Guardamos tabla + outcome en un JSON auditable
      return {
        version: table.version,
        roll: r,
        total,
        reward: { type: it.type, amount: it.amount },
        // opcional: snapshot de probabilidades para transparencia
        probabilities: items.map(x => ({
          type: x.type,
          amount: x.amount,
          weight: x.weight,
          pct: (x.weight / total) * 100
        }))
      };
    }
  }

  // No debería ocurrir
  throw new Error("SPIN_ROLL_FAILED");
}

function getLevelTargetPipes(level_id) {
  if (level_id === 0) return null;
  if (level_id === 99999) return null;

  const cfg = getLevelConfig(level_id); // ya existe en tu archivo :contentReference[oaicite:2]{index=2}
  const target = Number(cfg?.pipes_target);

  // si está definido por nivel, manda eso
  if (Number.isInteger(target) && target > 0) return target;

  // fallback: si no lo configuras en un nivel, usas el global
  return LEVEL_TARGET;
}

/*function getLevelTargetPipes(level_id) {
  // Infinity o baby => nunca complete_game “válido” (o lo decides tú)
  if (level_id === 0) return null;       // Infinity
  if (level_id === 99999) return null;   // Baby

  // Ejemplo simple: fijo 5 como hoy
  // Si mañana quieres escalar: return level_id <= 10 ? 5 : 10 ... etc.
  return LEVEL_TARGET;
}*/

async function generateUniqueUsername(env, googleSub) {
  for (let i = 0; i < 5; i++) {
    const candidate = generateUsername(googleSub, i);

    const exists = await env.DB.prepare(
      "SELECT 1 FROM users WHERE user_name = ? LIMIT 1"
    )
      .bind(candidate)
      .first();

    if (!exists) {
      return candidate;
    }
  }

  // fallback extremo (muy improbable)
  return `user_${googleSub.slice(-8)}`;
}

function randomDigits(length = 10) {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  return Array.from(array, n => (n % 10)).join("");
}

const ORIGINS = new Set([
  "http://localhost:3000",
  "https://192.168.1.81:3000",
  "https://qa.classic.flappypi.com",
  "https://classic.flappypi.com",
]);

function isAllowedOrigin(origin) {
  return origin && ORIGINS.has(origin);
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");

  // Si no hay Origin => probablemente server-to-server o navegación normal.
  // Para APIs, yo suelo NO agregar CORS si no hay Origin.
  if (!origin) return {};

  // Si el Origin no está permitido, NO devuelvas Allow-Origin.
  if (!isAllowedOrigin(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin",
  };
}

// Preflight estricto:
function corsPreflight(request) {
  const origin = request.headers.get("Origin");
  if (!isAllowedOrigin(origin)) {
    return new Response("CORS blocked", { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function generateUsername() {
  const prefix = "flappypi";
  const digits = randomDigits(10); // mínimo 10 números

  return `${prefix}_${digits}`;
}

function ymdHmsUTC(ms = Date.now()) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
         `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

async function audit(env, request, {
  user_id = null,
  action,
  outcome,
  reason = null,
  game_uid = null,
  nonce = null,
  score = null,
  delta_score = null,
  reward_json = null,
  meta = null
}) {
  try {
    const ts_ms = Date.now();
    const ts_ymd = ymdHmsUTC(ts_ms);
    const id = crypto.randomUUID();

    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
      null;

    const ua = request.headers.get("User-Agent") || null;
    const path = new URL(request.url).pathname;

    await env.DB.prepare(`
      INSERT INTO audit_events (
        id, ts_ms, ts_ymd,
        user_id, ip, ua, path,
        action, outcome, reason,
        game_uid, nonce,
        score, delta_score,
        reward_json, meta_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, ts_ms, ts_ymd,
      user_id, ip, ua, path,
      action, outcome, reason,
      game_uid, nonce,
      score, delta_score,
      reward_json ? (typeof reward_json === "string" ? reward_json : JSON.stringify(reward_json)) : null,
      meta ? JSON.stringify(meta).slice(0, 4000) : null
    ).run();
  } catch (e) {
    console.warn("audit failed:", e?.message || e);
  }
}


function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function calcDurationSec(payloadStartedAt) {
  return (Date.now() - Number(payloadStartedAt)) / 1000;
}

function validateCompleteGameAttempt({ payload, body }) {
  const { score, jumps, positions, complete_game } = body;

  const realPipesPassed = Number(
    body.pipes_passed ??
    body.difficulty_pipes_passed ??
    0
  );

  // Si ni lo están pidiendo, no hay nada que validar
  if (complete_game !== true) {
    return { ok: true, forcedComplete: false, reason: null, meta: { complete_requested: false } };
  }

  const mode = payload.mode;          // "levels" / "infinity"
  const level_id = Number(payload.level_id);

  // 1) Solo “levels” puede completar
  if (mode !== "levels") {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_NOT_LEVELS_MODE", meta: { mode, level_id } };
  }

  // 2) Level válido y no special
  if (!Number.isInteger(level_id) || level_id <= 0 || level_id === 99999) {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_INVALID_LEVEL_ID", meta: { level_id } };
  }

  // 3) Score mínimo = target pipes del backend
  const target = getLevelTargetPipes(level_id);
  if (!Number.isInteger(target) || target <= 0) {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_TARGET_NOT_DEFINED", meta: { level_id, target } };
  }

// El complete_game debe validarse por tubos reales pasados,
// no por score, porque score puede venir multiplicado por boost.
if (!Number.isInteger(realPipesPassed) || realPipesPassed < target) {
  return {
    ok: false,
    forcedComplete: false,
    reason: "COMPLETE_PIPES_BELOW_TARGET",
    meta: {
      score,
      realPipesPassed,
      target,
      level_id
    }
  };
}

  // 4) Duración mínima (anti “finish instantáneo”)
  const durationSec = calcDurationSec(payload.startedAt);

  // ✅ mínimo dinámico según target real del nivel
  const minDurationSec = Math.max(Math.min(MIN_BASE_SEC, target), target * MIN_SEC_PER_PIPE);

  if (durationSec < minDurationSec) {
    return {
      ok: false,
      forcedComplete: false,
      reason: "COMPLETE_TOO_FAST",
      meta: { durationSec, min: minDurationSec, target, level_id }
    };
  }

  // 5) Score/tiempo: tu regla actual (MAX_SCORE_PER_SEC) se mantiene,
  // pero acá le ponemos un límite más agresivo para complete_game:
  const MAX_COMPLETE_PIPES_PER_SEC = 2.0;

  if (realPipesPassed > durationSec * MAX_COMPLETE_PIPES_PER_SEC) {
    return {
      ok: false,
      forcedComplete: false,
      reason: "COMPLETE_PIPES_TIME_ANOMALY",
      meta: {
        score,
        realPipesPassed,
        durationSec,
        maxPps: MAX_COMPLETE_PIPES_PER_SEC
      }
    };
  }

  // 6) Jumps sanity (opcional pero útil)
  // ratio jumps/score demasiado alto podría ser macro; demasiado bajo podría ser “fake finish”
  if (Number.isInteger(jumps) && realPipesPassed > 0) {
    const ratio = jumps / realPipesPassed;
  
    if (ratio < 0.3) {
      return {
        ok: false,
        forcedComplete: false,
        reason: "COMPLETE_JUMPS_TOO_LOW",
        meta: {
          jumps,
          score,
          realPipesPassed,
          ratio
        }
      };
    }
  
    if (ratio > 30) {
      return {
        ok: false,
        forcedComplete: false,
        reason: "COMPLETE_JUMPS_TOO_HIGH",
        meta: {
          jumps,
          score,
          realPipesPassed,
          ratio
        }
      };
    }
  }

  // 7) positions sanity (si lo mandas): mínimo de muestras para “prueba de vida”
  // (no es prueba criptográfica, pero sube el costo de falsificar)
  // 7) positions sanity (anti-fake básico)
    // 7) positions sanity (anti-fake básico, server-driven)
   /* if (Array.isArray(positions)) {
      const n = positions.length;
  
      // samples/sec base: suficiente para "prueba de vida"
      const BASE_SAMPLES_PER_SEC = 4;
  
      // vx real del nivel (server truth)
      const lvlCfg = getLevelConfig(level_id); // <-- implementa esto (abajo)
      const vx = Number(lvlCfg?.vx || 1);
  
      // clamp de vx para no inflar requisitos por datos corruptos
      const speedFactor = clamp(vx, 0.6, 2.2);
  
      // Factor por nivel (más nivel, más exigencia), cap a MAX_LEVEL_CAP
      const cap = Number.isInteger(MAX_LEVEL_CAP) ? MAX_LEVEL_CAP : 5;
      const lvlIndex = clamp(level_id, 1, cap);
      const levelFactor = 1 + (lvlIndex / cap); // 1.2 .. 2.0 si cap=5
      const cappedLevelFactor = clamp(levelFactor, 1.1, 2.2);
  
      // samples esperados (duración * densidad)
      const expected = durationSec * BASE_SAMPLES_PER_SEC * speedFactor * cappedLevelFactor;
  
      // mínimo razonable (y cap duro)
      const minSamples = clamp(Math.floor(expected), 10, 80);
  
      if (n < minSamples) {
        return {
          ok: false,
          forcedComplete: false,
          reason: "COMPLETE_POSITIONS_TOO_FEW",
          meta: {
            n,
            minSamples,
            durationSec,
            vx,
            speedFactor,
            levelFactor: cappedLevelFactor,
            level_id
          }
        };
      }
    }  */

  // OK: lo aceptamos como complete real
  return {
    ok: true,
    forcedComplete: true,
    reason: null,
    meta: { mode, level_id, target, durationSec }
  };
}
function getLevelConfig(level_id) {
  return LEVEL_DEFINITION[level_id] || LEVEL_DEFINITION[String(level_id)] || null;
}
/* =========================
   JWT HELPERS
========================= */
function base64url(input) {
  return btoa(input)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(input) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = input.length % 4;
  if (pad) input += "=".repeat(4 - pad);
  return atob(input);
}

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

function decodeJWT(token) {
  const [, payload] = token.split(".");
  return JSON.parse(base64urlDecode(payload));
}

async function requireUser(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const token = cookie.match(/session=([^;]+)/)?.[1];

  if (!token) {
    return null;
  }

  let payload;
  try {
    //payload = decodeJWT(token);
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const user = await env.DB.prepare(
    "SELECT id, email, user_name, total_score, welcome_claimed FROM users WHERE id = ?"
  )
    .bind(payload.sub)
    .first();

  return user || null;
}

async function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("JWT_FORMAT");

  const [encHeader, encPayload, encSig] = parts;
  const data = `${encHeader}.${encPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const sigBytes = Uint8Array.from(atob(encSig.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encSig.length/4)*4, "=")), c => c.charCodeAt(0));

  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(data)
  );

  if (!ok) throw new Error("JWT_BAD_SIGNATURE");

  const payload = JSON.parse(base64urlDecode(encPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error("JWT_EXPIRED");

  const header = JSON.parse(base64urlDecode(encHeader));
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("JWT_HEADER_INVALID");
  }  

  return payload;
}

/* =========================
   WORKER
========================= */
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

    /* =========================
       CORS PREFLIGHT (OBLIGATORIO)
    ========================= */
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    const dailyRewardResponse = await routeDailyRewards(
      request,
      env,
      {
        requireUser,
        corsHeaders
      }
    );
  
    if (dailyRewardResponse) {
      return dailyRewardResponse;
    }

    const gamePhotoResponse = await routeGamePhoto(
      request,
      env,
      { requireUser, corsHeaders, normalizeGameId }
    );

    if (gamePhotoResponse) {
      return gamePhotoResponse;
    }
    /* =========================
       HEALTH
    ========================= */
    if (url.pathname === "/health") {
      return new Response("flappypi-auth OK");
    }
    /* =========================
      FLAPPYCOIN PI PRICE

      GET /shop/flappycoin/pi-price
    ========================= */

    if (
      request.method === "GET" &&
      url.pathname === "/shop/flappycoin/pi-price"
    ) {
      const piPrice = await getPiPriceUsd(env);

      return new Response(
        JSON.stringify({
          ok: true,
          currency: "USD",
          pi_price: piPrice.price_usd,
          source: piPrice.source,
          fallback: piPrice.fallback,
          updated_at: piPrice.updated_at,
          obtained_at: piPrice.obtained_at,
          cache_hit: piPrice.cache_hit,
          cache_layer: piPrice.cache_layer,
          attempts: piPrice.attempts,
          errors: Array.isArray(piPrice.errors)
            ? piPrice.errors
            : []
        }),
        {
          status: 200,

          headers: {
            ...corsHeaders(request),
            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-store, no-cache, must-revalidate",

            "Pragma":
              "no-cache"
          }
        }
      );
    }
    /* =========================
      FLAPPYCOIN SHOP CATALOG
    ========================= */

    if (request.method === "GET" && ( url.pathname === "/shop/flappycoin/catalog" || url.pathname === "/shop/flappycoin/prices" ) ) {
      try {
        const piPriceData = await getPiPriceUsd(env);

        const catalog = buildFlappyCoinCatalog(
          piPriceData
        );

        return new Response(JSON.stringify(catalog), {
          status: 200,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache"
          }
        });
      } catch (error) {
        console.error(
          "[FLAPPYCOIN CATALOG ERROR]",
          error?.stack || error?.message || error
        );

        return new Response(
          JSON.stringify({
            ok: false,
            error: "FLAPPYCOIN_CATALOG_FAILED",
            message: String(error?.message || error)
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json; charset=utf-8"
            }
          }
        );
      }
    }

    /* =========================
       LOGIN GOOGLE
    ========================= */
    if (url.pathname === "/auth/login") {
      const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");

      google.searchParams.set("client_id", env.CLIENT_ID);
      google.searchParams.set("redirect_uri", env.REDIRECT_URI);
      google.searchParams.set("response_type", "code");
      google.searchParams.set("scope", "openid email profile");
      google.searchParams.set("prompt", "select_account");

      return Response.redirect(google.toString(), 302);
    }

    /*if (url.pathname === "/eggs/claim-free" && request.method === "POST") {
    try{
      const user = await requireUser(request, env);
    
      if (!user) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request),
        });
      }
    
      const now = Date.now();
    
      const row = await env.DB.prepare(`
        SELECT eggs, last_free_egg_at
        FROM users
        WHERE id = ?
      `)
      .bind(user.id)
      .first();
    
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
              ...corsHeaders(request),
              "Content-Type": "application/json",
            },
          }
        );
      }
    
      // Operación atómica
      await env.DB.batch([
        // sumar huevo
        env.DB.prepare(`
          UPDATE users
          SET
            eggs = eggs + 100,
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
          eggs: row.eggs + 100,
          next_claim_at: now + FREE_EGG_COOLDOWN
        }),
        {
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      const errorInfo = {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause,
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
            ...corsHeaders(request),
            "Content-Type": "application/json",
          },
        }
      );
    }
    }    */

    /* =========================
       CALLBACK GOOGLE
    ========================= */
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
          grant_type: "authorization_code",
        }),
      });

      const token = await tokenRes.json();
      if (!token.access_token) {
        return new Response(JSON.stringify(token), { status: 500 });
      }

      const userRes = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        }
      );

      const user = await userRes.json();
      if (!user.sub || !user.email) {
        return new Response("Invalid user", { status: 500 });
      }

      /* ---- guardar en D1 ---- */
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
      )
        .bind(
          user.sub,
          user.email,
          user.name || null,
          user.picture || null,
          generatedUsername,
          Date.now()
        )
        .run();

      /* ---- crear JWT ---- */
      const jwt = await signJWT(
        {
          sub: user.sub,
          email: user.email,
          name: user.name,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
        },
        env.JWT_SECRET
      );

      const isProd = env.ENV !== "dev";
      const cookieFlags = isProd
        ? "HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000"
        : "HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000";

      /* ---- cookie + redirect (CON CORS) ---- */
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders(request),
          //"Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/`,
          //"Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000`,
          "Set-Cookie": `session=${jwt}; ${cookieFlags}`,
          "Location": FRONTEND_ORIGIN,
        },
      });
    }

    /* =========================
       ME (SESSION) + CORS
    ========================= */
    if (url.pathname === "/me") {
      const cookie = request.headers.get("Cookie") || "";
      const token = cookie.match(/session=([^;]+)/)?.[1];
      const lvlLoaded = url.searchParams.get("lvl_loaded") === "1";

      if (!token) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request),
        });
      }
    
      //const payload = decodeJWT(token);
      let payload;
      try {
        payload = await verifyJWT(token, env.JWT_SECRET);
      } catch {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
      }
      
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return new Response("Token expired", {
          status: 401,
          headers: corsHeaders(request),
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
          COALESCE(max_level_unlocked, 1) AS max_level_unlocked,
          COALESCE(last_selected_level, 0) AS last_selected_level,
          created_at,
          auth_provider,
          welcome_claimed,
          bird_color,
          hearts,
          free_spins,
          theme_mode,
          boost_multiplier,
          boost_expires_at,
          boost_source
        FROM users
        WHERE id = ?
      `)
      .bind(payload.sub)
      .first();
    
      if (!user) {
        return new Response("User not found", {
          status: 401,
          headers: corsHeaders(request),
        });
      }
      const [gameStatsRows, gameProgressRows] =
      await Promise.all([
        env.DB.prepare(`
          SELECT
            game_type,
            total_points,
            season_points,
            season_id,
            best_score,
            total_pipes,
            games_played,
            updated_at
          FROM user_game_stats
          WHERE user_id = ?
        `).bind(user.id).all(),
    
        env.DB.prepare(`
          SELECT
            game_type,
            max_level_unlocked,
            last_selected_level,
            updated_at
          FROM user_game_progress
          WHERE user_id = ?
        `).bind(user.id).all()
      ]);
    
    const gameStats = {};
    const gameProgress = {};
    
    for (
      const row of gameStatsRows?.results || []
    ) {
      const confirmedPoints = Number(
        row.total_points || 0
      );
    
      gameStats[row.game_type] = {
        confirmed_points: confirmedPoints,
        pending_points: 0,
        displayed_points: confirmedPoints,
    
        season_points: Number(
          row.season_points || 0
        ),
    
        season_id:
          row.season_id ||
          CURRENT_SEASON_ID,
    
        best_score: Number(
          row.best_score || 0
        ),
    
        total_pipes: Number(
          row.total_pipes || 0
        ),
    
        games_played: Number(
          row.games_played || 0
        ),
    
        sync_status: "confirmed",
    
        updated_at: Number(
          row.updated_at || 0
        )
      };
    }
    
    for (
      const row of gameProgressRows?.results || []
    ) {
      gameProgress[row.game_type] = {
        max_level_unlocked: Number(
          row.max_level_unlocked || 1
        ),
    
        last_selected_level: Number(
          row.last_selected_level || 0
        ),
    
        updated_at: Number(
          row.updated_at || 0
        )
      };
    }
    
    /*
      Si la Queue ya recibió puntos pero todavía no los
      consolidó, el recibo firmado permite mostrarlos.
    */
    const receiptTokenMe = getCookieValue(
      request,
      GAME_PROGRESS_RECEIPT_COOKIE
    );
    
    if (receiptTokenMe) {
      try {
        const receipt = await verifyJWT(
          receiptTokenMe,
          env.JWT_SECRET
        );
    
        if (
          receipt.type === "game_progress" &&
          receipt.sub === user.id
        ) {
          const receiptGame =
            getGameDefinition(
              receipt.game_type
            );
    
          if (
            receiptGame &&
            receipt.scoring_version ===
              receiptGame.scoringVersion
          ) {
            const session =
              await env.DB.prepare(`
                SELECT committed_metric
                FROM game_sessions
                WHERE game_uid = ?
                  AND user_id = ?
                  AND game_type = ?
              `).bind(
                receipt.game_uid,
                user.id,
                receiptGame.id
              ).first();
    
            const acceptedMetric = Number(
              receipt.accepted_metric || 0
            );
    
            const committedMetric = Number(
              session?.committed_metric || 0
            );
    
            const pendingMetric = Math.max(
              0,
              acceptedMetric - committedMetric
            );
    
            const pendingPoints =
              pendingMetric *
              receiptGame.pointsPerUnit;
    
            const currentStats =
              gameStats[receiptGame.id] || {
                confirmed_points: 0,
                pending_points: 0,
                displayed_points: 0,
                season_points: 0,
                season_id: CURRENT_SEASON_ID,
                best_score: 0,
                total_pipes: 0,
                games_played: 0,
                sync_status: "confirmed",
                updated_at: 0
              };
    
            currentStats.pending_points =
              pendingPoints;
    
            currentStats.displayed_points =
              Number(
                currentStats.confirmed_points || 0
              ) +
              pendingPoints;
    
            currentStats.sync_status =
              pendingPoints > 0
                ? "queued"
                : "confirmed";
    
            currentStats.pending_game_uid =
              receipt.game_uid;
    
            gameStats[receiptGame.id] =
              currentStats;
          }
        }
      } catch {
        /*
          Recibo expirado o alterado:
          mostramos solamente lo confirmado en D1.
        */
      }
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
      `)
      .bind(
        user.total_score,
        user.total_score,
        user.created_at
      )
      .first();
    
      const birdColor = user.bird_color || "yellow";
      let maxShields = BIRD_SHIELDS[birdColor] || 1;
      let bird_maxShields = BIRD_SHIELDS[birdColor] || 1;

      // shields actuales guardados del usuario (si los tienes en DB)
      let userShields = user.hearts || 0;

      // 🔥 Normalización dura
      if (userShields < maxShields)
        maxShields =  userShields;

      const ownedDragonsRows = await env.DB.prepare(`
        SELECT skin_id
        FROM user_dragon_skins
        WHERE user_id = ?
      `).bind(user.id).all();
      
      const owned_dragons = (ownedDragonsRows.results || []).map(r => r.skin_id);

      let data_return_LEVEL_DEFINITION = null;
      if(!lvlLoaded)
        data_return_LEVEL_DEFINITION = LEVEL_DEFINITION;

      const rankBundle = getRankBundle(Number(user.total_score || 0));

      const activeBoost = getActiveBoostRow(user);

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
        rank_total: rankRow.rank,
        max_level_unlocked: 0,//user.max_level_unlocked,
        last_selected_level: 0, //user.last_selected_level,
        auth_provider: user.auth_provider,
        welcome_claimed: user.welcome_claimed,
        bird_color: user.bird_color,
        hearts: user.hearts,
        bird_shields: maxShields, //Máximos escudos para utilizar por usuario
        bird_shields_max: bird_maxShields, //
        free_spins: user.free_spins,
        owned_dragons,
        LEVEL_DEFINITION: data_return_LEVEL_DEFINITION,
        rank_info: rankBundle,
        theme_mode: user.theme_mode || "day",
        active_boost: activeBoost,
        game_stats: gameStats,
        game_progress: gameProgress,
      }), {
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json"
        }
      });
    }    

    if (url.pathname === "/shop/boosts/buy" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
      }
    
      let body = {};
      try { body = await request.json(); } catch {}
    
      const boostId = String(body?.boost_id || "");
      const boost = BOOST_SHOP[boostId];
    
      if (!boost) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid boost_id" }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const now = Date.now();
      const expiresAt = now + boost.duration_ms;
    
      const updateRes = await env.DB.prepare(`
        UPDATE users
        SET
          eggs = eggs - ?,
          boost_multiplier = ?,
          boost_expires_at = ?,
          boost_source = ?
        WHERE id = ?
          AND eggs >= ?
      `).bind(
        boost.cost_eggs,
        boost.multiplier,
        expiresAt,
        boost.id,
        user.id,
        boost.cost_eggs
      ).run();
    
      if (!updateRes?.meta || updateRes.meta.changes !== 1) {
        const u = await env.DB.prepare(`SELECT eggs FROM users WHERE id = ?`).bind(user.id).first();
    
        return new Response(JSON.stringify({
          ok: false,
          error: "Not enough coins",
          eggs: Number(u?.eggs || 0)
        }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const updated = await env.DB.prepare(`
        SELECT eggs, boost_multiplier, boost_expires_at, boost_source
        FROM users
        WHERE id = ?
      `).bind(user.id).first();
    
      await audit(env, request, {
        user_id: user.id,
        action: "BOOST_PURCHASE_OK",
        outcome: "OK",
        reward_json: {
          boost_id: boost.id,
          multiplier: boost.multiplier,
          expires_at: expiresAt
        },
        meta: {
          cost_eggs: boost.cost_eggs
        }
      });
    
      return new Response(JSON.stringify({
        ok: true,
        eggs: Number(updated?.eggs || 0),
        active_boost: getActiveBoostRow(updated)
      }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/tops" && request.method === "GET") {

      const [topBest, topTotal] = await Promise.all([
    
        env.DB.prepare(`
          SELECT 
            name, 
            user_name, 
            max_score,
            bird_color
          FROM users
          /*WHERE max_score > 0*/
          ORDER BY max_score DESC, created_at ASC
          LIMIT 20
        `).all(),
    
        env.DB.prepare(`
          SELECT 
            name, 
            user_name, 
            COALESCE(tops_season_score, 0) AS total_score,
            bird_color
          FROM users
          where auth_provider = 'pi'
          /*WHERE COALESCE(tops_season_score, 0) > 0*/
          ORDER BY COALESCE(tops_season_score, 0) DESC, created_at ASC
          LIMIT 20
        `).all()
    
      ]);
    
      let me_best = null;
      let me_total = null;
      let var_audit = "";
    
      const user = await requireUser(request, env);
    
      if (user?.id) {
        const meRow = await env.DB.prepare(`
          SELECT id, name, user_name, bird_color, created_at,
                 COALESCE(max_score,0) AS max_score,
                 COALESCE(total_score,0) AS total_score,
                 COALESCE(tops_season_score,0) AS tops_season_score
          FROM users
          WHERE id = ?
        `).bind(user.id).first();
    
        if (meRow) {
    
          const rBest = await env.DB.prepare(`
            SELECT COUNT(*) + 1 AS rank
            FROM users
            WHERE
              COALESCE(max_score, 0) > ?
              OR (
                COALESCE(max_score, 0) = ?
                AND created_at < ?
              )
          `).bind(meRow.max_score, meRow.max_score, meRow.created_at).first();
    
          me_best = {
            rank: Number(rBest?.rank || 1),
            name: meRow.name,
            user_name: meRow.user_name,
            max_score: Number(meRow.max_score),
            bird_color: meRow.bird_color || "yellow"
          };
    
          const rTotal = await env.DB.prepare(`
            SELECT COUNT(*) + 1 AS rank
            FROM users
            WHERE
              COALESCE(tops_season_score, 0) > ?
              OR (
                COALESCE(tops_season_score, 0) = ?
                AND created_at < ?
              )
          `).bind(
            meRow.tops_season_score,
            meRow.tops_season_score,
            meRow.created_at
          ).first();
    
          me_total = {
            rank: Number(rTotal?.rank || 1),
            name: meRow.name,
            user_name: meRow.user_name,
            total_score: Number(meRow.tops_season_score),
            real_total_score: Number(meRow.total_score),
            bird_color: meRow.bird_color || "yellow"
          };
        }
      }
    
      const me_total_rank_info = me_total
        ? getRankBundle(Number(me_total.real_total_score || 0))
        : null;
    
      return new Response(JSON.stringify({
        var_audit,
        best: topBest.results ?? [],
        total: topTotal.results ?? [],
        me_best,
        me_total,
        me_total_rank_info
      }), {
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache"
        }
      });
    }
    if (url.pathname === "/tops/world" && request.method === "GET") {

      const topWorld = await env.DB.prepare(`
        SELECT 
          id,
          name, 
          user_name, 
          COALESCE(total_score, 0) AS total_score,
          bird_color,
          auth_provider,
          created_at
        FROM users
        /*WHERE COALESCE(total_score, 0) > 0*/
        ORDER BY COALESCE(total_score, 0) DESC, created_at ASC
        LIMIT 20
      `).all();
    
      let me_world = null;
      let var_audit = "";
    
      const user = await requireUser(request, env);
    
      if (user?.id) {
        const meRow = await env.DB.prepare(`
          SELECT 
            id,
            name,
            user_name,
            bird_color,
            created_at,
            auth_provider,
            COALESCE(total_score, 0) AS total_score
          FROM users
          WHERE id = ?
        `).bind(user.id).first();
    
        if (meRow) {
          const rWorld = await env.DB.prepare(`
            SELECT COUNT(*) + 1 AS rank
            FROM users
            WHERE
              COALESCE(total_score, 0) > ?
              OR (
                COALESCE(total_score, 0) = ?
                AND created_at < ?
              )
          `).bind(
            meRow.total_score,
            meRow.total_score,
            meRow.created_at
          ).first();
    
          me_world = {
            rank: Number(rWorld?.rank || 1),
            id: meRow.id,
            name: meRow.name,
            user_name: meRow.user_name,
            total_score: Number(meRow.total_score),
            bird_color: meRow.bird_color || "yellow",
            auth_provider: meRow.auth_provider || "guest"
          };
        }
      }
    
      const me_world_rank_info = me_world
        ? getRankBundle(Number(me_world.total_score || 0))
        : null;
    
      return new Response(JSON.stringify({
        var_audit,
        world: topWorld.results ?? [],
        me_world,
        me_world_rank_info
      }), {
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache"
        }
      });
    }
    if (
      url.pathname === "/game/state" &&
      request.method === "POST"
    ) {
      const user = await requireUser(
        request,
        env
      );
    
      if (!user) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request)
        });
      }
    
      const body = await readJsonSafe(request);
    
      const game = getGameDefinition(
        body?.game_type ||
        "flappy_classic"
      );
    
      if (!game || game.id === "legacy") {
        return new Response(JSON.stringify({
          ok: false,
          code: "UNKNOWN_GAME_TYPE"
        }), {
          status: 400,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
    
      const requestedLast = Number(
        body?.last_selected_level
      );
    
      if (!Number.isInteger(requestedLast)) {
        return new Response(JSON.stringify({
          ok: false,
          code: "INVALID_LEVEL"
        }), {
          status: 400,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
    
      const row = await env.DB.prepare(`
        SELECT max_level_unlocked
        FROM user_game_progress
        WHERE user_id = ?
          AND game_type = ?
      `).bind(
        user.id,
        game.id
      ).first();
    
      const maxLevelUnlocked = Number(
        row?.max_level_unlocked || 1
      );
    
      const isSpecial =
        game.specialLevels.includes(
          requestedLast
        );
    
      if (
        !isSpecial &&
        (
          requestedLast < 1 ||
          requestedLast > maxLevelUnlocked ||
          requestedLast > game.maxLevel
        )
      ) {
        return new Response(JSON.stringify({
          ok: false,
          code: "LEVEL_NOT_UNLOCKED",
          max_level_unlocked:
            maxLevelUnlocked
        }), {
          status: 409,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
    
      await env.DB.prepare(`
        INSERT INTO user_game_progress (
          user_id,
          game_type,
          max_level_unlocked,
          last_selected_level,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
    
        ON CONFLICT(user_id, game_type)
        DO UPDATE SET
          last_selected_level =
            excluded.last_selected_level,
    
          updated_at =
            excluded.updated_at
      `).bind(
        user.id,
        game.id,
        maxLevelUnlocked,
        requestedLast,
        Date.now()
      ).run();
    
      return new Response(JSON.stringify({
        ok: true,
        game_type: game.id,
        max_level_unlocked:
          maxLevelUnlocked,
        last_selected_level:
          requestedLast
      }), {
        status: 200,
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json"
        }
      });
    } 

/* =========================================================
   GAME PROGRESS
   Acumulado cada 15 segundos desde el frontend.
   No escribe directamente en D1.
========================================================= */

if (
  url.pathname === "/game/progress" &&
  request.method === "POST"
) {

  const body = await readJsonSafe(request);

  const gameToken = String(
    body?.gameToken || ""
  );
  
  const sessionToken = String(
    getCookieValue(
      request,
      "session"
    ) || ""
  );
  
  if (!gameToken || !sessionToken) {
    return new Response(JSON.stringify({
      ok: false,
      code: !gameToken
        ? "MISSING_GAME_TOKEN"
        : "MISSING_SESSION"
    }), {
      status: 401,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json"
      }
    });
  }
  
  let payload;
  let sessionPayload;
  
  try {
    [
      payload,
      sessionPayload
    ] = await Promise.all([
      verifyJWT(
        gameToken,
        env.JWT_SECRET
      ),
  
      verifyJWT(
        sessionToken,
        env.JWT_SECRET
      )
    ]);
  } catch {
    return new Response(JSON.stringify({
      ok: false,
      code: "JWT_INVALID"
    }), {
      status: 401,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json"
      }
    });
  }
  
  if (
    payload.type !== "game" ||
    !payload.sub ||
    payload.sub !== sessionPayload.sub
  ) {
    return new Response(JSON.stringify({
      ok: false,
      code: "JWT_CONTEXT_INVALID"
    }), {
      status: 401,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json"
      }
    });
  }
  
  /*
    Identidad validada mediante los dos JWT.
    No consultamos D1 en cada checkpoint.
  */
  const user = {
    id: String(payload.sub)
  };

  const game = getGameDefinition(
    payload.game_type || "legacy"
  );

  if (
    !game ||
    game.id === "legacy" ||
    payload.scoring_version !==
      game.scoringVersion
  ) {
    return new Response(JSON.stringify({
      ok: false,
      code:
        "GAME_SCORING_CONTEXT_INVALID"
    }), {
      status: 400,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json"
      }
    });
  }

  const cumulativeMetric = Number(
    body?.cumulative_metric
  );

  const receiptToken = String(
    body?.receiptToken ||
    getCookieValue(
      request,
      GAME_PROGRESS_RECEIPT_COOKIE
    ) ||
    ""
  );

  let progress;

  try {
    progress = await enqueueGameProgress({
      env,
      user,
      payload,
      game,
      receiptToken,
      cumulativeMetric,
      final: false
    });
  } catch (error) {
    const code = String(
      error?.message ||
      "GAME_PROGRESS_FAILED"
    );

    console.warn("[GAME PROGRESS REJECTED]", {
      user_id: user.id,
      game_uid:
        payload.game_uid || null,
      game_type: game.id,
      cumulative_metric:
        cumulativeMetric,
      reason: code
    });

    return new Response(JSON.stringify({
      ok: false,
      code,
      message:
        "Game progress rejected"
    }), {
      status: 400,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json"
      }
    });
  }
  if (env.ENV === "dev") {
    console.log("[GAME PROGRESS QUEUED]", {
      user_id: user.id,
      game_uid: payload.game_uid,
      game_type: game.id,
      seq: progress.seq,
      cumulative_metric:
        progress.cumulativeMetric,
      delta_metric:
        progress.deltaMetric,
      queued:
        progress.queued
    });
  }
  const headers = new Headers({
    ...corsHeaders(request),
    "Content-Type": "application/json"
  });

  if (progress.receiptToken) {
    headers.append(
      "Set-Cookie",
      makeGameProgressCookie(
        progress.receiptToken,
        env
      )
    );
  }

  return new Response(JSON.stringify({
    ok: true,

    game_uid:
      payload.game_uid,

    game_type:
      game.id,

    metric_name:
      getGameMetricName(game),

    accepted_seq:
      progress.seq,

    accepted_metric:
      progress.cumulativeMetric,

    accepted_points:
      progress.cumulativePoints,

    delta_metric:
      progress.deltaMetric,

    points_accepted:
      progress.deltaPoints,

    sync_status:
      progress.confirmed
        ? "confirmed"
        : progress.queued
          ? "queued"
          : "unchanged",

    receiptToken:
      progress.receiptToken
  }), {
    status: 200,
    headers
  });
}

    /* =========================
      PROFILE UPDATE
    ========================= */
    if (url.pathname === "/profile/update" && request.method === "POST") {
      const user = await requireUser(request, env);

      if (!user) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request),
        });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON", {
          status: 400,
          headers: corsHeaders(request),
        });
      }

      const { name, wallet, twitter, bird_color, theme_mode } = body;

      if (!name || !name.trim()) {
        return new Response("Name required", {
          status: 400,
          headers: corsHeaders(request),
        });
      }

      // opcional: validación básica wallet
      if (wallet && wallet.length > 120) {
        return new Response("Invalid wallet", {
          status: 400,
          headers: corsHeaders(request),
        });
      }

      let real_color = bird_color;

      //const allowedColors = ["yellow", "red"];
      if (!allowedColors.includes(real_color)) {
        //return json({ success: false, message: "Invalid bird color" }, 400);
        real_color = "yellow";
      }

      if(!BASE_BIRDS.includes(real_color))
      {
        //Dragones comprados
        const rows = await env.DB.prepare(`
          SELECT skin_id
          FROM user_dragon_skins
          WHERE user_id = ?
        `).bind(user.id).all();

        const ownedDragons = rows.results.map(r => r.skin_id);

        // Validación real
        if (!ownedDragons.includes(real_color)) {
          real_color = "yellow"; // fallback seguro
        }
      }

      let twitterClean = null;

      if (twitter) {
        twitterClean = twitter
          .replace(/^@/, "")   // elimina @ si lo ponen
          .trim();
      
        if (!/^[a-zA-Z0-9_]{1,15}$/.test(twitterClean)) {
          return new Response("Invalid Twitter username", {
            status: 400,
            headers: corsHeaders(request),
          });
        }
      }

      const allowedThemeModes = ["dark", "day"];
      const safeThemeMode = allowedThemeModes.includes(theme_mode) ? theme_mode : "day";

      await env.DB.prepare(`
        UPDATE users
        SET
          name = ?,
          pi_wallet = ?,
          twitter = ?,
          bird_color = ?,
          theme_mode = ?
        WHERE id = ?
      `)
      .bind(
        name.trim(),
        wallet?.trim() || null,
        twitterClean,
        real_color,
        safeThemeMode,
        user.id
      )
      .run();

      return new Response(
        JSON.stringify({ ok: true, bird_color: real_color, theme_mode: safeThemeMode }),
        {
          status: 200,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const MAX_REVIVES = 3;

    if (url.pathname === "/game/revive" && request.method === "POST") {
      const user = await requireUser(request, env);
    
      if (!user) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request)
        });
      }
    
      let body;
    
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON", {
          status: 400,
          headers: corsHeaders(request)
        });
      }
    
      if (env.ENV !== "dev") {
        const { turnstile_token } = body;
    
        const ts = await verifyTurnstileToken({
          token: turnstile_token,
          request,
          env
        });
    
        if (!ts.ok) {
          await audit(env, request, {
            user_id: user.id,
            action: "TURNSTILE_REJECT",
            outcome: "REJECT",
            reason: ts.code + ", game-revive not found turnstile_token",
            meta: { details: ts.details || null }
          });
    
          /*
            Por ahora mantiene tu comportamiento actual:
            auditamos pero NO cortamos el revive.
          */
        }
      }
    
      const { gameToken } = body;
    
      if (!gameToken) {
        return new Response("Missing game token", {
          status: 400,
          headers: corsHeaders(request)
        });
      }
    
      let payload;
    
      try {
        payload = await verifyJWT(gameToken, env.JWT_SECRET);
      } catch {
        return new Response("Invalid game token", {
          status: 401,
          headers: corsHeaders(request)
        });
      }
    
      if (payload.sub !== user.id || payload.type !== "game") {
        return new Response("Invalid game token", {
          status: 401,
          headers: corsHeaders(request)
        });
      }
    
      const { game_uid } = payload;
    
      if (!game_uid) {
        return new Response("Invalid game context", {
          status: 400,
          headers: corsHeaders(request)
        });
      }
    
      /*
        DB manda:
        contamos revives reales usados en esta partida.
      */
      const reviveAgg = await env.DB.prepare(`
        SELECT COUNT(*) AS cnt
        FROM game_revives
        WHERE game_uid = ? AND user_id = ?
      `).bind(game_uid, user.id).first();
    
      const used = Number(reviveAgg?.cnt || 0);
    
      if (used >= MAX_REVIVES) {
        return new Response(
          JSON.stringify({
            ok: false,
            message: "Revive limit reached",
            revives_used: used,
            max_revives: MAX_REVIVES
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json"
            }
          }
        );
      }
    
      const reviveNo = used + 1;
    
      /*
        Nuevo modelo:
        revive #1 => FREE
        revive #2 => 500 coins
        revive #3 => 500 coins
    
        Se elimina revive por publicidad.
      */
      const eggsCost = reviveNo === 1 ? 0 : 500;
    
      if (eggsCost > 0) {
        const upd = await env.DB.prepare(`
          UPDATE users
          SET eggs = eggs - ?
          WHERE id = ? AND eggs >= ?
        `).bind(
          eggsCost,
          user.id,
          eggsCost
        ).run();
    
        if (!upd?.meta || upd.meta.changes !== 1) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_REVIVE_REJECT",
            outcome: "REJECT",
            reason: "NOT_ENOUGH_COINS",
            game_uid,
            nonce: payload.nonce,
            meta: {
              reviveNo,
              eggsCost
            }
          });
    
          return new Response(
            JSON.stringify({
              ok: false,
              message: "Not enough coins",
              revive_no: reviveNo,
              eggs_cost: eggsCost
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json"
              }
            }
          );
        }
      }
    
      /*
        Siempre registramos revive.
        Incluso el FREE.
        Esto evita que el revive gratis pueda repetirse.
      */
      await env.DB.prepare(`
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
      ).run();
    
      const dbUser2 = await env.DB.prepare(`
        SELECT eggs
        FROM users
        WHERE id = ?
      `).bind(user.id).first();
    
      await audit(env, request, {
        user_id: user.id,
        action: "GAME_REVIVE_OK",
        outcome: "OK",
        game_uid,
        nonce: payload.nonce,
        meta: {
          reviveNo,
          eggsCost,
          method: eggsCost === 0 ? "free" : "eggs"
        }
      });
    
      return new Response(
        JSON.stringify({
          ok: true,
          revive_no: reviveNo,
          revives_used: reviveNo,
          max_revives: MAX_REVIVES,
          eggs_used: eggsCost,
          eggs_left: Number(dbUser2?.eggs ?? 0),
          method: eggsCost === 0 ? "free" : "eggs"
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        }
      );
    }   

    if (url.pathname === "/auth/guest-login" && request.method === "POST") {
      try {

        let body = {};
        try {
          body = await request.json();
        } catch {}


        if (env.ENV !== "dev") {
          const turnstileToken = body.turnstileToken || body.turnstile_token || null;
        
          if (turnstileToken) {
            const ts = await verifyTurnstileToken({
              token: turnstileToken,
              request,
              env
            });
        
            if (!ts.ok) {
              await audit(env, request, {
                user_id: null,
                action: "TURNSTILE_SOFT_FAIL_GUEST",
                outcome: "ALLOW",
                reason: ts.code || "turnstile_invalid",
                meta: { details: ts.details || null }
              });
        
              // NO return, deja continuar
            }
          } else {
            await audit(env, request, {
              user_id: null,
              action: "TURNSTILE_MISSING_GUEST",
              outcome: "ALLOW",
              reason: "missing_turnstile_token",
              meta: null
            });
        
            // NO return, deja continuar
          }
        }

        const now = Date.now();
    
        const cookie = request.headers.get("Cookie") || "";
        let guestId = cookie.match(/flappypi_guest_id=([^;]+)/)?.[1];
    
        let user = null;
    
        if (guestId) {
          guestId = decodeURIComponent(guestId);
    
          user = await env.DB.prepare(`
            SELECT id
            FROM users
            WHERE id = ?
              AND auth_provider = 'guest'
          `).bind(guestId).first();
        }

        if (!user) {
          guestId = `guest_${crypto.randomUUID()}`;
    
          const guestUsername = `guest_${guestId.slice(-6)}`;
    
          await env.DB.prepare(`
            INSERT INTO users (
              id,
              auth_provider,
              user_name,
              name,
              eggs,
              max_score,
              total_score,
              max_level_unlocked,
              last_selected_level,
              theme_mode,
              created_at
            ) VALUES (?, 'guest', ?, ?, 0, 0, 0, 1, 0, 'day', ?)
          `).bind(
            guestId,
            guestUsername,
            guestUsername,
            now
          ).run();
        }
    
        const HUNDRED_YEARS = 60 * 60 * 24 * 365 * 100; // 3153600000

        //now = Math.floor(Date.now() / 1000);
        
        const jwt = await signJWT({
          sub: guestId,
          iat: now,
          exp: now + HUNDRED_YEARS
        }, env.JWT_SECRET);
        
        const isProd = env.ENV !== "dev";
        
        const sessionCookieFlags = isProd
          ? `HttpOnly; SameSite=None; Secure; Path=/; Max-Age=${HUNDRED_YEARS}`
          : `HttpOnly; SameSite=Lax; Path=/; Max-Age=${HUNDRED_YEARS}`;
        
        const guestCookieFlags = isProd
          ? `SameSite=None; Secure; Path=/; Max-Age=${HUNDRED_YEARS}`
          : `SameSite=Lax; Path=/; Max-Age=${HUNDRED_YEARS}`;
        const headers = new Headers({
          ...corsHeaders(request),
          "Content-Type": "application/json"
        });
    
        headers.append("Set-Cookie", `session=${jwt}; ${sessionCookieFlags}`);
        headers.append("Set-Cookie", `flappypi_guest_id=${encodeURIComponent(guestId)}; ${guestCookieFlags}`);
    
        return new Response(JSON.stringify({
          ok: true,
          guest: true,
          user_id: guestId
        }), {
          status: 200,
          headers
        });
    
      } catch (err) {
        const errorInfo = {
          name: err?.name,
          message: err?.message,
          stack: err?.stack,
          cause: err?.cause,
        };
    
        return new Response("Internal Server Error" + JSON.stringify(errorInfo, null, 2), {
          status: 500,
          headers: corsHeaders(request),
        });
      }
    }

    /* =========================
      LOGOUT
    ========================= */
    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders(request),
          // borrar cookie
          "Set-Cookie": "session=; HttpOnly; SameSite=None; Path=/; Max-Age=0",
          // volver al frontend
          "Location": FRONTEND_ORIGIN
        },
      });
    }

    if (url.pathname === "/auth/pi-login" && request.method === "POST") {
      try{
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", {
            status: 400,
            headers: corsHeaders(request)
          });
        }
      
        const { accessToken } = body;
        if (!accessToken) {
          return new Response("Missing accessToken", {
            status: 400,
            headers: corsHeaders(request)
          });
        }
      
        // 🔐 validar token contra Pi Network
        const piUser = await verifyPiAccessToken(accessToken, env);
        if (!piUser || !piUser.username) {
          return new Response("Invalid Pi token", {
            status: 401,
            headers: corsHeaders(request)
          });
        }
      
        const userId = piUser.uid;
        const generatedUsername_pi = await generateUniqueUsername(env, piUser.username);

        // 🔎 buscar usuario
        let user = await env.DB.prepare(
          "SELECT id FROM users WHERE id = ?"
        ).bind(userId).first();
      
        // 🆕 crear usuario si no existe
        if (!user) {
          await env.DB.prepare(`
            INSERT INTO users (
              id,
              auth_provider,
              user_name,
              name,
              eggs,
              max_score,
              total_score,
              max_level_unlocked,
              last_selected_level,
              theme_mode,
              created_at
            ) VALUES (?, 'pi', ?, ?, 0, 0, 0, 1, 0, 'day', ?)
          `).bind(
            userId,
            generatedUsername_pi,
            piUser.username,
            Date.now()
          ).run();
        }
      
        // 🔐 crear JWT como con Google
        const jwt = await signJWT({
          sub: userId,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
        }, env.JWT_SECRET);
      
        const isProd = env.ENV !== "dev";
        const cookieFlags = isProd
          ? "HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000"
          : "HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000";
        

        return new Response(
          JSON.stringify({ ok: true }),
          {
            status: 200,
            headers: {
              ...corsHeaders(request),
              //"Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/`,
              //"Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000`,
              "Set-Cookie": `session=${jwt}; ${cookieFlags}`,
              "Content-Type": "application/json"
            }
          }
        );


      } catch (err) {
        // 🔥 EVITA CORS FANTASMA 🔥
        if (err instanceof Response) {
          return new Response(err.body, {
            status: err.status,
            headers: corsHeaders(request),
          });
        }
    
        const errorInfo = {
          name: err?.name,
          message: err?.message,
          stack: err?.stack,
          cause: err?.cause,
        };
    
        return new Response("Internal Server Error" + JSON.stringify(errorInfo, null, 2), {
          status: 500,
          headers: corsHeaders(request),
        });
      }
    }    

    if (url.pathname === "/game/finish" && request.method === "POST") {
      const __t0 = Date.now();
      const debugTimes = {};
    
      const mark = (label) => {
        debugTimes[label] = Number(((Date.now() - __t0) / 1000).toFixed(4));
      };
    
      mark("start");
    
      const user = await requireUser(request, env);
      mark("requireUser");
    
      if (!user) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request)
        });
      }
    
      let body;
      try {
        body = await request.json();
        mark("json_parse");
      } catch {
        mark("json_parse_error");
        return new Response("Invalid JSON", {
          status: 400,
          headers: corsHeaders(request)
        });
      }
    
      if (env.ENV !== "dev") {
        let ts = { ok: false, code: "TURNSTILE_UNKNOWN" };
      
        try {
          ts = await verifyTurnstileToken({
            token: body.turnstile_token,
            request,
            env
          });
      
          mark("turnstile_verify");
        } catch (e) {
          ts = {
            ok: false,
            code: "TURNSTILE_ERROR",
            details: String(e?.message || e)
          };
      
          mark("turnstile_error");
        }
      
        if (!ts.ok) {
          ctx.waitUntil(audit(env, request, {
            user_id: user.id,
            action: "TURNSTILE_SOFT_FAIL",
            outcome: "WARN",
            reason: ts.code,
            meta: {
              details: ts.details || null,
              game_uid: body?.game_uid || null,
              score: body?.score || null,
              mode: "soft_allow"
            }
          }));
      
          mark("turnstile_soft_fail_queued");
      
          // No corta el juego.
          // Continúa con validaciones internas: JWT, nonce, score/time anomaly, etc.
        }
      }
    
      let { score, jumps, positions, gameToken, shieldsUsed, complete_game, isFinal } = body;

      ctx.waitUntil(audit(env, request, {
        user_id: user.id,
        action: "GAME_FINISH_ATTEMPT",
        outcome: "OK",
        meta: {
          score,
          complete_game_requested: complete_game === true,
          shieldsUsed,
          isFinal
        }
      }));
      
      mark("audit_attempt_queued");
    
      if (!gameToken) {
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_REJECTED",
          outcome: "REJECT",
          reason: "MISSING_GAME_TOKEN"
        });
        mark("reject_missing_game_token");
    
        return new Response(JSON.stringify({
          ok: false,
          code: "MISSING_GAME_TOKEN",
          message: "Missing game token",
          debug_times: debugTimes
        }), {
          status: 401,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      let payload;
      try {
        payload = await verifyJWT(gameToken, env.JWT_SECRET);
        mark("verifyJWT");
      } catch (e) {
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_REJECTED",
          outcome: "REJECT",
          reason: "JWT_INVALID",
          meta: { msg: String(e?.message || "") }
        });
        mark("reject_jwt_invalid");
    
        return new Response(JSON.stringify({
          ok: false,
          code: "JWT_INVALID",
          message: "Invalid game token",
          debug_times: debugTimes
        }), {
          status: 401,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      if (payload.type !== "game" || payload.sub !== user.id) {
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_REJECTED",
          outcome: "REJECT",
          reason: "JWT_CONTEXT_INVALID",
          meta: { type: payload.type, sub: payload.sub }
        });
        mark("reject_jwt_context_invalid");
    
        return new Response(JSON.stringify({
          ok: false,
          code: "JWT_CONTEXT_INVALID",
          message: "Invalid game token",
          debug_times: debugTimes
        }), {
          status: 401,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      const game = getGameDefinition(payload.game_type || "legacy");
      const tokenScoringVersion = String(payload.scoring_version || "legacy-v1");
      
      if (!game || tokenScoringVersion !== game.scoringVersion) {
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_REJECTED",
          outcome: "REJECT",
          reason: "GAME_SCORING_CONTEXT_INVALID",
          meta: {
            game_type: payload.game_type || null,
            scoring_version: payload.scoring_version || null
          }
        });
      
        return new Response(JSON.stringify({
          ok: false,
          code: "GAME_SCORING_CONTEXT_INVALID",
          message: "Invalid game scoring context",
          debug_times: debugTimes
        }), {
          status: 401,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }

      const clientScore2 = Number(score);
      let officialResult;

      try {
        officialResult = calculateOfficialGameScore(game, body);
        score = officialResult.score;
      } catch (err) {
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_REJECTED",
          outcome: "REJECT",
          reason: err.message || "INVALID_GAME_METRIC",
          meta: {
            game_type: game.id,
            client_score: clientScore2
          }
        });

        return new Response(JSON.stringify({
          ok: false,
          code: err.message || "INVALID_GAME_METRIC",
          message: "Invalid game metric",
          debug_times: debugTimes
        }), {
          status: 400,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
 
      const { nonce, game_uid } = payload;
    
      const startedAtServer = Number(payload.startedAt);
      if (!Number.isFinite(startedAtServer)) {
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_REJECTED",
          outcome: "REJECT",
          reason: "JWT_STARTEDAT_INVALID",
          game_uid,
          nonce
        });
        mark("reject_startedAt_invalid");
    
        return new Response(JSON.stringify({
          ok: false,
          code: "JWT_STARTEDAT_INVALID",
          message: "Invalid game token (startedAt)",
          debug_times: debugTimes
        }), {
          status: 401,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const durationSec = (Date.now() - startedAtServer) / 1000;
      const MAX_GAME_DURATION_SEC = 60 * 60 * 3;
    
      if (durationSec > MAX_GAME_DURATION_SEC) {
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_REJECTED",
          outcome: "REJECT",
          reason: "GAME_EXPIRED",
          game_uid,
          nonce,
          meta: { durationSec, max: MAX_GAME_DURATION_SEC }
        });
        mark("reject_game_expired");
    
        return new Response(JSON.stringify({
          ok: false,
          code: "GAME_EXPIRED",
          message: "Game expired",
          debug_times: debugTimes
        }), {
          status: 401,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const maxScorePerSecEffective = game.maxScorePerSec;
    
      mark("basic_validations");
    
      if (score > durationSec * maxScorePerSecEffective) {
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_REJECTED",
          outcome: "REJECT",
          reason: "SCORE_TIME_ANOMALY",
          game_uid,
          nonce,
          score,
          meta: {
            game_type: game.id,
            durationSec,
            maxSps: maxScorePerSecEffective
          }
        });
        mark("reject_score_time_anomaly");
    
        return new Response(JSON.stringify({
          ok: false,
          code: "SCORE_TIME_ANOMALY",
          message: "Score/time anomaly",
          debug_times: debugTimes
        }), {
          status: 403,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      let nonceKeyReq = null;
      let activeKeyReq = null;
    
      if (env.ENV !== "dev") {
        activeKeyReq = cacheKey(`game-active/${user.id}`);
    
        const active = await caches.default.match(activeKeyReq);
        mark("cache_active_match");
    
        if (!active || (await active.text()) !== nonce) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "NOT_ACTIVE_GAME",
            game_uid,
            nonce
          });
          mark("reject_not_active_game");
    
          return new Response(JSON.stringify({
            ok: false,
            code: "NOT_ACTIVE_GAME",
            message: "Not active game",
            debug_times: debugTimes
          }), {
            status: 401,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
    
        nonceKeyReq = cacheKey(`game-nonce/${nonce}`);
    
        const nonceEntry = await caches.default.match(nonceKeyReq);
        mark("cache_nonce_match");
    
        if (!nonceEntry) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "NONCE_MISSING_OR_USED",
            game_uid,
            nonce
          });
          mark("reject_nonce_missing_or_used");
    
          return new Response(JSON.stringify({
            ok: false,
            code: "NONCE_MISSING_OR_USED",
            message: "Game already used",
            debug_times: debugTimes
          }), {
            status: 401,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
      }
    
      let complete_game_safe = (complete_game === true);
    
      if (complete_game_safe) {
        const completeCheck = game.completionValidator === "flappy_pipes"
            ? validateCompleteGameAttempt({ payload, body: { ...body, score } })
            : {
                ok: false,
                forcedComplete: false,
                reason: "COMPLETE_VALIDATOR_NOT_CONFIGURED",
                meta: { game_type: game.id }
              };
        mark("validate_complete_game");
    
        if (!completeCheck.ok) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_COMPLETE_REJECTED",
            outcome: "REJECT",
            reason: completeCheck.reason,
            game_uid,
            nonce,
            score,
            meta: {
              ...completeCheck.meta,
              complete_game_requested: true,
              complete_game_forced: false,
              durationSec,
              jumps,
              shieldsUsed
            }
          });
          mark("audit_complete_rejected");
    
          complete_game_safe = false;
        } else {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_COMPLETE_ACCEPTED",
            outcome: "OK",
            game_uid,
            nonce,
            score,
            meta: {
              ...completeCheck.meta,
              complete_game_requested: true,
              complete_game_forced: true,
              durationSec,
              jumps,
              shieldsUsed
            }
          });
          mark("audit_complete_accepted");
        }
      }
    /* =========================================================
   MODERN GAME FINISH
   Puntos → Queue
   Nivel/recompensas → D1 directo
========================================================= */

if (game.id !== "legacy") {
  const finalRequested =
    isFinal !== false;

  const receiptToken = String(
    body?.receiptToken ||
    getCookieValue(
      request,
      GAME_PROGRESS_RECEIPT_COOKIE
    ) ||
    ""
  );

  let progress;

  try {
    progress = await enqueueGameProgress({
      env,
      user,
      payload,
      game,
      receiptToken,

      cumulativeMetric:
        officialResult.metric,

      final:
        finalRequested
    });
  } catch (error) {
    const code = String(
      error?.message ||
      "GAME_PROGRESS_FAILED"
    );

    await audit(env, request, {
      user_id: user.id,
      action: "GAME_FINISH_REJECTED",
      outcome: "REJECT",
      reason: code,
      game_uid,
      nonce,
      score,

      meta: {
        game_type: game.id,

        metric_name:
          getGameMetricName(game),

        metric_value:
          officialResult.metric
      }
    });

    return new Response(JSON.stringify({
      ok: false,
      code,
      message:
        "Final game progress rejected",
      debug_times: debugTimes
    }), {
      status: 400,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json"
      }
    });
  }

  const progressHeaders = new Headers({
    ...corsHeaders(request),
    "Content-Type": "application/json"
  });

  if (progress.receiptToken) {
    progressHeaders.append(
      "Set-Cookie",
      makeGameProgressCookie(
        progress.receiptToken,
        env
      )
    );
  }

  /*
    Compatibilidad temporal:
    si se llama finish con isFinal:false,
    funciona solamente como checkpoint.
  */
  if (!finalRequested) {
    mark("modern_progress_only");

    return new Response(JSON.stringify({
      ok: true,
      partial: true,
      game_uid,
      game_type: game.id,

      metric_name:
        getGameMetricName(game),

      accepted_metric:
        progress.cumulativeMetric,

      accepted_run_points:
        progress.cumulativePoints,

      points_accepted:
        progress.deltaPoints,

      sync_status:
      progress.confirmed
        ? "confirmed"
        : progress.queued
          ? "queued"
          : "unchanged",

      receiptToken:
        progress.receiptToken,

      delta_score: 0,
      debug_times: debugTimes
    }), {
      status: 200,
      headers: progressHeaders
    });
  }

  const now = Date.now();

  const metricName =
    getGameMetricName(game);

  const metricValue =
    officialResult.metric;

  const runPoints =
    officialResult.score;

  const pipesPassed =
    isPipeMetric(game)
      ? metricValue
      : 0;

  /*
    INSERT OR IGNORE requiere el índice único
    de game_uid para partidas no legacy.
  */
  const insertGameResult =
    await env.DB.prepare(`
      INSERT OR IGNORE INTO games (
        user_id,
        score,
        id_parent,
        created_at,
        game_uid,
        shields_used,
        game_type,
        pipes_passed,
        points_earned,
        scoring_version,
        metric_name,
        metric_value,
        level_id,
        mode
      )
      VALUES (
        ?, ?, NULL, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      )
    `).bind(
      user.id,
      runPoints,
      now,
      game_uid,
      shieldsUsed || 0,
      game.id,
      pipesPassed,
      runPoints,
      game.scoringVersion,
      metricName,
      metricValue,
      Number(payload.level_id || 0),
      String(payload.mode || "infinity")
    ).run();

  const firstFinal =
    Number(
      insertGameResult?.meta?.changes || 0
    ) === 1;

  /*
    Si llega un finish repetido, mantenemos
    solamente los valores máximos.
  */
  await env.DB.prepare(`
    UPDATE games
    SET
      score = CASE
        WHEN ? > score THEN ?
        ELSE score
      END,

      shields_used = CASE
        WHEN ? > shields_used THEN ?
        ELSE shields_used
      END,

      pipes_passed = CASE
        WHEN ? > pipes_passed THEN ?
        ELSE pipes_passed
      END,

      points_earned = CASE
        WHEN ? > points_earned THEN ?
        ELSE points_earned
      END,

      metric_name = ?,

      metric_value = CASE
        WHEN ? > metric_value THEN ?
        ELSE metric_value
      END,

      scoring_version = ?,
      level_id = ?,
      mode = ?

    WHERE game_uid = ?
      AND user_id = ?
      AND game_type = ?
  `).bind(
    runPoints,
    runPoints,

    shieldsUsed || 0,
    shieldsUsed || 0,

    pipesPassed,
    pipesPassed,

    runPoints,
    runPoints,

    metricName,

    metricValue,
    metricValue,

    game.scoringVersion,
    Number(payload.level_id || 0),
    String(payload.mode || "infinity"),

    game_uid,
    user.id,
    game.id
  ).run();

  /*
    games_played global y shields se afectan
    solamente durante el primer finish.
  */
  if (firstFinal) {
    await env.DB.prepare(`
      UPDATE users
      SET
        games_played =
          games_played + 1,

        hearts = CASE
          WHEN hearts >= ?
          THEN hearts - ?
          ELSE 0
        END

      WHERE id = ?
    `).bind(
      shieldsUsed || 0,
      shieldsUsed || 0,
      user.id
    ).run();
  }

  let levelProgress = {
    completed:
      complete_game_safe === true,

    advanced: false,

    completed_level:
      Number(payload.level_id || 0),

    max_level_unlocked: null,
    next_level: null
  };

  try {
    levelProgress =
      await applyGameLevelProgress({
        env,
        userId: user.id,
        game,
        payload,

        completeGameSafe:
          complete_game_safe
      });
    } catch (error) {
      const code = String(
        error?.message ||
        "LEVEL_PROGRESS_FAILED"
      );
    
      await audit(env, request, {
        user_id: user.id,
        action:
          "GAME_LEVEL_PROGRESS_REJECTED",
        outcome: "REJECT",
        reason: code,
        game_uid,
        nonce,
        score,
    
        meta: {
          game_type: game.id,
          level_id: payload.level_id
        }
      });
    
      /*
        No eliminamos nonce ni active game.
        El frontend puede reintentar finish.
    
        Los puntos no se duplican porque Queue utiliza
        acumulados y games utiliza game_uid único.
      */
      return new Response(JSON.stringify({
        ok: false,
        code,
        message:
          "Points were queued, but level progress could not be saved.",
    
        game_uid,
        game_type: game.id,
    
        points_sync_status:
      progress.confirmed
        ? "confirmed"
        : progress.queued
          ? "queued"
          : "unchanged",
    
        receiptToken:
          progress.receiptToken,
    
        retryable:
          code !== "LEVEL_NOT_UNLOCKED",
    
        debug_times:
          debugTimes
      }), {
        status:
          code === "LEVEL_NOT_UNLOCKED"
            ? 409
            : 503,
    
        headers:
          progressHeaders
      });
    }

    let spinCreated = false;

    const completedLevel = Number(
      payload.level_id || 0
    );
    
    const unlockedAfterFinish = Number(
      levelProgress.max_level_unlocked || 0
    );
    
    /*
      Caso normal:
      levelProgress.advanced === true.
    
      Caso de reintento:
      la etapa ya avanzó, pero el spin pudo fallar
      después del UPDATE. firstFinal será false y la
      etapa corresponde exactamente al nivel anterior.
    */
    const retryingLevelReward =
      firstFinal === false &&
      complete_game_safe === true &&
      Number.isInteger(completedLevel) &&
      unlockedAfterFinish > 1 &&
      completedLevel ===
        unlockedAfterFinish - 1;
    
    const shouldCreateLevelSpin =
      game.levelRewardEnabled === true &&
      complete_game_safe === true &&
      (
        levelProgress.advanced === true ||
        retryingLevelReward
      );
    
    if (shouldCreateLevelSpin) {
      spinCreated =
        await createGameCompletionSpin(
          env,
          user.id,
          game_uid,
          completedLevel
        );
    }

  if (env.ENV !== "dev") {
    if (nonceKeyReq) {
      await caches.default.delete(
        nonceKeyReq
      );
    }

    if (activeKeyReq) {
      await caches.default.delete(
        activeKeyReq
      );
    }
  }

  ctx.waitUntil(audit(env, request, {
    user_id: user.id,
    action: "GAME_FINISH_COMMITTED",
    outcome: "OK",
    game_uid,
    nonce,
    score: runPoints,
    delta_score: 0,

    meta: {
      game_type: game.id,
      metric_name: metricName,
      metric_value: metricValue,

      points_queued:
        progress.deltaPoints,

      run_points:
        runPoints,

      complete_game_safe,

      level_advanced:
        levelProgress.advanced === true,

      spin_created:
        spinCreated,

      first_final:
        firstFinal
    }
  }));

  mark("modern_finish_complete");

  return new Response(JSON.stringify({
    ok: true,
    game_uid,
    game_type: game.id,

    metric_name:
      metricName,

    metric_value:
      metricValue,

    accepted_run_points:
      progress.cumulativePoints,

    points_accepted:
      progress.deltaPoints,

    sync_status:
      progress.confirmed
        ? "confirmed"
        : progress.queued
          ? "queued"
          : "unchanged",

    receiptToken:
      progress.receiptToken,

    level:
      levelProgress,

    spin_created:
      spinCreated,

    /*
      Compatibilidad:
      no animar flames con puntos por juego.
    */
    delta_score: 0,

    legacy_total_score_changed:
      false,

    debug_times:
      debugTimes
  }), {
    status: 200,
    headers: progressHeaders
  });
}
      const [lastGame, currentUserBefore] = await Promise.all([
        env.DB.prepare(`
          SELECT id, score
          FROM games
          WHERE user_id = ? AND game_uid = ?
          ORDER BY created_at DESC
          LIMIT 1
        `).bind(user.id, game_uid).first(),
      
        env.DB.prepare(`
          SELECT total_score, max_score
          FROM users
          WHERE id = ?
        `).bind(user.id).first()
      ]);
      
      mark("db_last_game_and_user_before_parallel");

      /*const lastGame = await env.DB.prepare(`
        SELECT id, score
        FROM games
        WHERE user_id = ? AND game_uid = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(user.id, game_uid).first();
      mark("db_last_game");*/
    
      const lastScore = lastGame ? Number(lastGame.score) : 0;
    
      if (lastGame && score < lastScore) {
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_REJECTED",
          outcome: "REJECT",
          reason: "SCORE_REGRESSION",
          game_uid,
          nonce,
          score,
          meta: { lastScore }
        });
        mark("reject_score_regression");
    
        return new Response(JSON.stringify({
          ok: false,
          code: "SCORE_REGRESSION",
          message: "Invalid score regression",
          debug_times: debugTimes
        }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const deltaScore = score - lastScore;
      const parentId = lastGame ? lastGame.id : null;
      const isFirstInsert = !lastGame;
    
      /*const currentUserBefore = await env.DB.prepare(`
        SELECT total_score, max_score
        FROM users
        WHERE id = ?
      `).bind(user.id).first();
      mark("db_current_user_before");*/
    
      const oldTotalScoreBeforeFinish = Number(currentUserBefore?.total_score || 0);
      const oldRankInfo = getRankBundle(oldTotalScoreBeforeFinish);
      const oldRank = Number(oldRankInfo?.current?.rank || 1);
    
      const newTotalScoreAfterFinish = oldTotalScoreBeforeFinish + deltaScore;
      const newRankInfo = getRankBundle(newTotalScoreAfterFinish);
      const newRank = Number(newRankInfo?.current?.rank || oldRank);
    
      mark("rank_calculation");
    
      await env.DB.prepare(`
        UPDATE users SET
          games_played = games_played + ?,
          total_score = total_score + ?,
          tops_season_score = tops_season_score + ?,
          max_score = CASE WHEN ? > max_score THEN ? ELSE max_score END,
          hearts = CASE WHEN hearts >= ? THEN hearts - ? ELSE 0 END
        WHERE id = ?
      `).bind(
        isFirstInsert ? 1 : 0,
        deltaScore,
        deltaScore,
        score,
        score,
        shieldsUsed || 0,
        shieldsUsed || 0,
        user.id
      ).run();
      
      mark("db_update_user_score");
      
      ctx.waitUntil(
        env.DB.prepare(`
          INSERT INTO games (user_id, score, id_parent, created_at, game_uid, shields_used)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          user.id,
          score,
          parentId,
          Date.now(),
          game_uid,
          shieldsUsed || 0
        ).run()
      );
      
      mark("db_insert_game_queued");
    
      let spinCreated = false;
    
      if (complete_game_safe) {
        let source_level = "game";
        let level_id = payload?.level_id;
    
        if (level_id) source_level = "game_level_" + level_id;
    
        const spinId = crypto.randomUUID();
        const now = Date.now();
    
        try {
          await env.DB.prepare(`
            INSERT INTO spins (id, user_id, game_uid, status, reward_json, created_at, claimed_at, source)
            VALUES (?, ?, ?, 'PENDING', NULL, ?, NULL, ?)
          `).bind(spinId, user.id, game_uid, now, source_level).run();
          mark("db_spin_insert");
    
          await env.DB.prepare(`UPDATE users SET free_spins = free_spins + 1 WHERE id = ?`)
            .bind(user.id).run();
          mark("db_spin_user_update");
    
          spinCreated = true;
        } catch (e) {
          mark("db_spin_error");
    
          const msg = String(e?.message || "");
          if (!msg.includes("UNIQUE") && !msg.includes("constraint")) throw e;
    
          spinCreated = false;
        }
      }
    
      if (env.ENV !== "dev" && complete_game_safe) {
        await caches.default.delete(nonceKeyReq);
        mark("cache_nonce_delete");
    
        await caches.default.delete(activeKeyReq);
        mark("cache_active_delete");
      }
    
      if (newRank > oldRank) {
        const rewardStatements = [];
    
        for (let rankStep = oldRank + 1; rankStep <= newRank; rankStep++) {
          const rewardCfg = buildArenaRewardForRank(rankStep);
    
          rewardStatements.push(
            env.DB.prepare(`
              INSERT INTO user_arena_rewards (
                id,
                user_id,
                from_rank,
                to_rank,
                reward_coins,
                reward_spins,
                status,
                created_at,
                claimed_at
              )
              VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, NULL)
            `).bind(
              crypto.randomUUID(),
              user.id,
              rankStep - 1,
              rankStep,
              Number(rewardCfg.coins || 0),
              Number(rewardCfg.spins || 0),
              Date.now()
            )
          );
        }
    
        mark("arena_rewards_build");
    
        if (rewardStatements.length) {
          await env.DB.batch(rewardStatements);
          mark("db_arena_rewards_batch");
        }
      }
    
      const updatedUser = await env.DB.prepare(`
        SELECT total_score, max_score, games_played, free_spins
        FROM users
        WHERE id = ?
      `).bind(user.id).first();
      mark("db_updated_user");
    
      ctx.waitUntil(audit(env, request, {
        user_id: user.id,
        action: "GAME_FINISH_COMMITTED",
        outcome: "OK",
        game_uid,
        nonce,
        score,
        delta_score: deltaScore,
        meta: {
          durationSec,
          shieldsUsed,
          jumps,
          complete_game_requested: complete_game === true,
          complete_game_safe,
          spinCreated
        }
      }));
      
      mark("audit_committed_queued");
    
      const isNewBest = score > Number(currentUserBefore?.max_score || 0);
    
      const shouldPublishGameActivity =
        deltaScore > 0 &&
        (
          deltaScore >= 10 ||
          score >= 50 ||
          isNewBest === true
        );
    
      if (shouldPublishGameActivity) {
        ctx.waitUntil(insertActivityFeed(env, {
          activityType: "high_score",
          actorUserId: user.id,
          targetUserId: null,
          referenceTable: "games",
          referenceId: null,
          payload: {
            score: Number(score || 0),
            delta_score: Number(deltaScore || 0),
            is_new_best: isNewBest === true,
            total_score: Number(updatedUser.total_score || 0)
          },
          priority: isNewBest ? 3 : 2
        }));
        mark("insert_activity_feed_queued");
      }
    
      /*const pendingArenaRewardsRow = await env.DB.prepare(`
        SELECT COUNT(*) AS total
        FROM user_arena_rewards
        WHERE user_id = ?
          AND status = 'PENDING'
      `).bind(user.id).first();
      mark("db_pending_arena_rewards_count");*/
    
      mark("total");
    
      return new Response(JSON.stringify({
        ok: true,
        total_score: updatedUser.total_score,
        max_score: updatedUser.max_score,
        games_played: updatedUser.games_played,
        delta_score: deltaScore,
        is_new_best: isNewBest,
        free_spins: updatedUser.free_spins,
        arena_rank_before: oldRank,
        arena_rank_after: newRank,
        arena_rank_up: newRank > oldRank,
        //pending_arena_rewards: Number(pendingArenaRewardsRow?.total || 0),
    
        debug_times: debugTimes
      }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }    

    /* =========================
      NUEVO ENDPOINT: /spin/claim
      - reclama 1 spin pendiente (FIFO)
      - sortea reward (rollSpin)
      - aplica reward atómico + marca CLAIMED
    ========================= */
    if (url.pathname === "/spin/claim" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
      }

      const now = Date.now();

      // 1) buscar 1 spin pendiente
      const spin = await env.DB.prepare(`
        SELECT id, game_uid
        FROM spins
        WHERE user_id = ? AND status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 1
      `).bind(user.id).first();

      if (!spin) {
        return new Response(JSON.stringify({
          ok: false,
          reason: "no_pending_spin"
        }), {
          status: 404,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }

      // 2) sortear reward
      const rewardPayload = rollSpin(SPIN_TABLE_V2);
      const reward = rewardPayload.reward;

      // 3) aplicar en batch (atómico)
      // Nota: guardamos reward_json con probabilidades para transparencia/auditoría
      const rewardJson = JSON.stringify({
        ...rewardPayload,
        claimed_at: now,
        source: "free_finish_spin"
      });

      let userUpdateStmt;
      if (reward.type === "eggs") {
        userUpdateStmt = env.DB.prepare(`
          UPDATE users
          SET eggs = eggs + ?,
          free_spins = free_spins - 1
          WHERE id = ? AND free_spins > 0
        `).bind(reward.amount, user.id);
      } else if (reward.type === "hearts") {
        userUpdateStmt = env.DB.prepare(`
          UPDATE users
          SET hearts = hearts + ?,
          free_spins = free_spins - 1
          WHERE id = ? AND free_spins > 0
        `).bind(reward.amount, user.id);
      } else {
        return new Response(JSON.stringify({
          ok: false,
          reason: "invalid_reward_type"
        }), {
          status: 500,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }

      // Importante: marcamos spin como CLAIMED SOLO si estaba PENDING (evita doble claim)
      //const spinClaimStmt = env.DB.prepare(`
      //  UPDATE spins
      //  SET status = 'CLAIMED',
      //      reward_json = ?,
      //      claimed_at = ?
      //  WHERE id = ? AND user_id = ? AND status = 'PENDING'
      //`).bind(rewardJson, now, spin.id, user.id);

      //await env.DB.batch([spinClaimStmt, userUpdateStmt]);

      // 1) intentar marcar CLAIMED
      const claimRes = await env.DB.prepare(`
        UPDATE spins
        SET status = 'CLAIMED',
            reward_json = ?,
            claimed_at = ?
        WHERE id = ? AND user_id = ? AND status = 'PENDING'
      `).bind(rewardJson, now, spin.id, user.id).run();

      if (!claimRes?.meta || claimRes.meta.changes !== 1) {

        await audit(env, request, {
          user_id: user.id,
          action: "SPIN_CLAIM_CONFLICT",
          outcome: "CONFLICT",
          reason: "ALREADY_CLAIMED",
          game_uid: spin.game_uid,
          meta: { spin_id: spin.id }
        });        

        return new Response(JSON.stringify({ ok: false, reason: "already_claimed" }), {
          status: 409,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }

      // 2) recién aquí acreditas al usuario (ya nadie más puede claimear ese spin)
      await userUpdateStmt.run();


      // 4) devolver estado actualizado
      const updated = await env.DB.prepare(`
        SELECT eggs, hearts, free_spins
        FROM users
        WHERE id = ?
      `).bind(user.id).first();

      await audit(env, request, {
        user_id: user.id,
        action: "SPIN_CLAIM_OK",
        outcome: "OK",
        game_uid: spin.game_uid,
        reward_json: rewardJson,
        meta: {
          spin_id: spin.id,
          reward
        }
      });      

      return new Response(JSON.stringify({
        ok: true,
        spin_id: spin.id,
        game_uid: spin.game_uid,
        reward,
        // si quieres mostrar % al usuario, ya viene en rewardPayload.probabilities
        //probabilities: rewardPayload.probabilities,
        eggs: updated?.eggs ?? null,
        hearts: updated?.hearts ?? null,
        free_spins: updated?.free_spins ?? null
      }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST" && url.pathname === "/welcome/claim") {
      try {
        const user = await requireUser(request, env);
    
        if (!user) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders(request),
          });
        }
    
        // 1. Verificar si ya reclamó
        if (user.welcome_claimed) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Welcome coins already claimed",
              eggs: user.eggs
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json",
              }
            }
          );
        }
    
        const WELCOME_EGGS = 4000;
        const WELCOME_SHIELD = 0;
        const WELCOME_SPIN = 5;
    
        // 2. Actualizar usuario
        await env.DB.prepare(`
          UPDATE users
          SET 
            eggs = eggs + ?,
            hearts = hearts + ?,
            free_spins = free_spins + ?,
            welcome_claimed = TRUE
          WHERE id = ?
        `).bind(
          WELCOME_EGGS,
          WELCOME_SHIELD,
          WELCOME_SPIN,
          user.id
        ).run();
    
        // 3. Leer estado actualizado
        const updatedUser = await env.DB.prepare(`
          SELECT eggs, hearts FROM users WHERE id = ?
        `).bind(user.id).first();
    
        for (let i = 0; i < WELCOME_SPIN; i++) {
          await env.DB.prepare(`
            INSERT INTO spins (id, user_id, source, status, created_at, game_uid, reward_json)
            VALUES (?, ?, 'welcome', 'PENDING', ?, NULL, NULL)
          `).bind(crypto.randomUUID(), user.id, Date.now()).run();
        } 

        // 4. Responder al frontend
        return new Response(
          JSON.stringify({
            success: true,
            eggs: updatedUser.eggs,
            hearts: updatedUser.hearts,
            added: WELCOME_EGGS,
            added_hearts: WELCOME_SHIELD,
            added_spin: WELCOME_SPIN
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json",
            },
          }
        );
    
      } catch (e) {
        console.error("claim-welcome-eggs error:", e);
    
        return new Response(
          JSON.stringify({
            success: false,
            message: "Internal server error " + e
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json",
            },
          }
        );
      }
    }    
    
    if (url.pathname === "/shop/dragons/buy" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
    
      const body = await request.json().catch(() => ({}));
      const skinId = String(body?.dragon_id || body?.skin_id || "");
      if (!skinId) {
        return new Response(JSON.stringify({ ok:false, error:"Missing skin_id" }), {
          status: 400, headers: { ...corsHeaders(request), "Content-Type":"application/json" }
        });
      }
    
      // catálogo (ajusta si tu tabla no se llama dragons)
      const skin = await env.DB.prepare(`
        SELECT id, cost_eggs
        FROM dragon_skins
        WHERE id = ? AND COALESCE(active,1)=1
        LIMIT 1
      `).bind(skinId).first();
    
      if (!skin) {
        return new Response(JSON.stringify({ ok:false, error:"Skin not found" }), {
          status: 404, headers: { ...corsHeaders(request), "Content-Type":"application/json" }
        });
      }
    
      const cost = Number(skin.cost_eggs || 0);
    
      // ✅ versión segura: reservar primero, cobrar después
      const now = Date.now();
    
      const ins = await env.DB.prepare(`
        INSERT OR IGNORE INTO user_dragon_skins (user_id, skin_id, purchased_at)
        VALUES (?, ?, ?)
      `).bind(user.id, skinId, now).run();
    
      if (!ins?.meta || ins.meta.changes !== 1) {
        const u = await env.DB.prepare(`SELECT eggs FROM users WHERE id=?`).bind(user.id).first();
        return new Response(JSON.stringify({
          ok: true,
          already_owned: true,
          skin_id: skinId,
          eggs: Number(u?.eggs || 0)
        }), {
          status: 200, headers: { ...corsHeaders(request), "Content-Type":"application/json" }
        });
      }
    
      const upd = await env.DB.prepare(`
        UPDATE users
        SET eggs = eggs - ?
        WHERE id = ? AND eggs >= ?
      `).bind(cost, user.id, cost).run();
    
      if (!upd?.meta || upd.meta.changes !== 1) {
        // rollback manual
        await env.DB.prepare(`
          DELETE FROM user_dragon_skins
          WHERE user_id = ? AND skin_id = ?
        `).bind(user.id, skinId).run();
    
        const u = await env.DB.prepare(`SELECT eggs FROM users WHERE id=?`).bind(user.id).first();
        return new Response(JSON.stringify({
          ok: false,
          error: "Not enough coins",
          code: "NO_EGGS",
          eggs: Number(u?.eggs || 0),
          cost
        }), {
          status: 400, headers: { ...corsHeaders(request), "Content-Type":"application/json" }
        });
      }

      // Leer todos los dragones actuales
      const owned = await env.DB.prepare(`
        SELECT skin_id
        FROM user_dragon_skins
        WHERE user_id = ?
      `).bind(user.id).all();

      const ownedDragons = owned.results.map(r => r.skin_id);

      const u2 = await env.DB.prepare(`SELECT eggs FROM users WHERE id=?`).bind(user.id).first();
      return new Response(JSON.stringify({
        ok: true,
        skin_id: skinId,
        cost,
        eggs: Number(u2?.eggs || 0),
        purchased_at: now,
        owned_dragons: ownedDragons
      }), {
        status: 200, headers: { ...corsHeaders(request), "Content-Type":"application/json" }
      });
    }    

    /* -------- GAME START -------- */
    if (url.pathname === "/game/start" && request.method === "POST") {
      const user = await requireUser(request, env);
    
      if (!user) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request),
        });
      }

      const startedAt = Date.now();

      const nonce = crypto.randomUUID();
      const gameUid = crypto.randomUUID();      // ID lógico del juego
    
      let body = {};
      try { body = await request.json(); } catch {}

      const game = getGameDefinition(body?.game_type || "legacy");

      if (!game) {
        return new Response(JSON.stringify({
          ok: false,
          code: "UNKNOWN_GAME_TYPE",
          message: "Unknown game type"
        }), {
          status: 400,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
      /*if (env.ENV !== "dev") {
        const ts = await verifyTurnstileToken({
          token: body.turnstile_token,
          request,
          env
        });
      
        if (!ts.ok) {
          await audit(env, request, {
            user_id: user.id,
            action: "TURNSTILE_REJECT",
            outcome: "REJECT",
            reason: ts.code,
            meta: { details: ts.details || null }
          });
      
          return new Response(JSON.stringify({
            ok: false,
            code: ts.code,
            message: "Bot check failed. Please try again."
          }), {
            status: 403,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
      }*/

        const mode =
        body?.mode === "levels"
          ? "levels"
          : "infinity";
      
      const requestedLevel = Number(
        body?.level_id || 0
      );
      
      const level_id = normalizeGameLevel(
        requestedLevel,
        game
      );
      
      if (
        mode === "levels" &&
        requestedLevel !== level_id
      ) {
        return new Response(JSON.stringify({
          ok: false,
          code: "INVALID_GAME_LEVEL"
        }), {
          status: 400,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
      
      if (
        mode === "levels" &&
        game.levelProgression === true &&
        level_id > 0 &&
        !game.specialLevels.includes(level_id)
      ) {
        const progressRow =
          await env.DB.prepare(`
            SELECT max_level_unlocked
            FROM user_game_progress
            WHERE user_id = ?
              AND game_type = ?
          `).bind(
            user.id,
            game.id
          ).first();
      
        const maxLevelUnlocked = Number(
          progressRow?.max_level_unlocked || 1
        );
      
        if (level_id > maxLevelUnlocked) {
          return new Response(JSON.stringify({
            ok: false,
            code: "LEVEL_NOT_UNLOCKED",
            max_level_unlocked:
              maxLevelUnlocked
          }), {
            status: 409,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json"
            }
          });
        }
      }

      const gameToken = await signJWT({
        sub: user.id,
        nonce,
        game_uid: gameUid,
        type: "game",
        startedAt,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3,
        game_type: game.id,
        scoring_version: game.scoringVersion,
        level_id,
        mode
      }, env.JWT_SECRET);
      const receiptToken =
      await createGameProgressReceipt({
        env,
        userId: user.id,
        gameUid,
        game,
        seq: 0,
        acceptedMetric: 0,
        acceptedPoints: 0,
        lastServerAt: startedAt
      });
      // 👉 Cache SOLO en producción
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
    
      if (env.ENV !== "dev") {
        try {
          await caches.default.put(
            cacheKey(`revive-count/${user.id}`),
      
            new Response("0", {
              headers: {
                "Cache-Control":
                  "max-age=86400"
              }
            })
          );
        } catch (error) {
          console.warn(
            "Revive cache not available:",
            error
          );
        }
      }

      await audit(env, request, {
        user_id: user.id,
        action: "GAME_START",
        outcome: "OK",
        game_uid: gameUid,
        nonce,
        meta: {
          exp: "3h",
          game_type: game.id,
          scoring_version: game.scoringVersion,
          scoring_engine: game.engine,
          mode,
          level_id
        }
      });

      const startHeaders = new Headers({
        ...corsHeaders(request),
        "Content-Type": "application/json"
      });
      
      if (game.id !== "legacy") {
        startHeaders.append(
          "Set-Cookie",
          makeGameProgressCookie(
            receiptToken,
            env
          )
        );
      }
      
      return new Response(JSON.stringify({
        gameToken,
        game_uid: gameUid,
        game_type: game.id,
      
        metric_name:
          getGameMetricName(game),
      
        receiptToken:
          game.id !== "legacy"
            ? receiptToken
            : null
      }), {
        status: 200,
        headers: startHeaders
      });
    }

    if (url.pathname === "/ads/revive/consume" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
      }
    
      const body = await readJsonSafe(request);
      const tid = String(body?.tid || "").trim();
      if (!tid) {
        return new Response(JSON.stringify({ ok: false, error: "tid_required" }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const row = await env.DB.prepare(`
        SELECT status
        FROM ad_rewards
        WHERE provider='applixir' AND reward_type='revive' AND tid=? AND user_id=?
        LIMIT 1
      `).bind(tid, user.id).first();
    
      if (!row) {
        return new Response(JSON.stringify({ ok: false, error: "tid_not_found" }), {
          status: 404,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      if (row.status !== "rewarded") {
        return new Response(JSON.stringify({ ok: false, error: "not_rewarded_yet", status: row.status }), {
          status: 409,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const now = Date.now();
      const upd = await env.DB.prepare(`
        UPDATE ad_rewards
        SET status='consumed', consumed_at=?
        WHERE tid=? AND user_id=? AND status='rewarded'
      `).bind(now, tid, user.id).run();
    
      await audit(env, request, {
        user_id: user.id,
        action: "AD_REVIVE_CONSUME",
        outcome: upd?.meta?.changes === 1 ? "OK" : "CONFLICT",
        meta: { tid }
      });
    
      return new Response(JSON.stringify({ ok: true, consumed: (upd?.meta?.changes || 0) === 1 }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/ads/applixir/callback") {
      const now = Date.now();
      const q = new URL(request.url).searchParams;
    
      // AppLixir puede mandar GET o POST; capturamos todo:
      const body = (request.method === "POST") ? (await readJsonSafe(request) || {}) : {};
      const payload = {
        method: request.method,
        query: Object.fromEntries(q.entries()),
        body,
        ip: request.headers.get("CF-Connecting-IP") || null,
        ua: request.headers.get("User-Agent") || null,
        ts: now
      };
    
      // Buscar tid en varios nombres comunes
      const tid =
        body?.tid ||
        body?.transaction_id ||
        body?.transactionId ||
        q.get("tid") ||
        q.get("transaction_id") ||
        q.get("transactionId");
    
      if (!tid) {
        // responder 200 para no reintentar infinito
        return new Response(JSON.stringify({ ok: false, error: "tid_missing" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    
      // Marcar rewarded SOLO si estaba pending
      const res = await env.DB.prepare(`
        UPDATE ad_rewards
        SET status='rewarded', payload_json=?, rewarded_at=?
        WHERE provider='applixir' AND reward_type='revive' AND tid=? AND status='pending'
      `).bind(
        JSON.stringify(payload).slice(0, 4000),
        now,
        tid
      ).run();
    
      // audit opcional
      await audit(env, request, {
        user_id: null,
        action: "APPLIXIR_CALLBACK",
        outcome: "OK",
        reason: res?.meta?.changes === 1 ? "UPDATED" : "NO_CHANGE",
        meta: { tid }
      });
    
      return new Response(JSON.stringify({ ok: true, tid, updated: res?.meta?.changes || 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/ads/revive/start" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
      }
    
      const tid = makeTid("adrevive");
      const now = Date.now();
    
      await env.DB.prepare(`
        INSERT INTO ad_rewards (
          id, provider, reward_type, tid, user_id, status, created_at
        ) VALUES (?, 'applixir', 'revive', ?, ?, 'pending', ?)
      `).bind(
        crypto.randomUUID(),
        tid,
        user.id,
        now
      ).run();
    
      // opcional audit
      await audit(env, request, {
        user_id: user.id,
        action: "AD_REVIVE_START",
        outcome: "OK",
        meta: { tid }
      });
    
      return new Response(JSON.stringify({ ok: true, tid }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST" && url.pathname === "/api/buy-heart") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response(
          JSON.stringify({ error: true, message: "Unauthorized" }),
          {
            status: 401,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json",
            },
          }
        );
      }
    
      // 👇 leer el body
      const body = await request.json();
      const heartsToBuy = Number(body.hearts || 0);
    
      if (heartsToBuy <= 0) {
        return new Response(
          JSON.stringify({ error: true, message: "Invalid hearts amount" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json",
            },
          }
        );
      }
    
      const HEART_COST = 300;
      const totalCost = HEART_COST * heartsToBuy;
    
      const current = await env.DB.prepare(`
        SELECT eggs, hearts FROM users WHERE id = ?
      `).bind(user.id).first();
    
      if (!current) {
        return new Response(
          JSON.stringify({ error: true, message: "User not found" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json",
            },
          }
        );
      }
    
      if (current.eggs < totalCost) {
        return new Response(
          JSON.stringify({
            error: true,
            message: "Not enough coins",
            eggs: current.eggs,
            hearts: current.hearts,
            required: totalCost
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json",
            },
          }
        );
      }
    
      const newEggs = current.eggs - totalCost;
      const newHearts = current.hearts + heartsToBuy;
    
      await env.DB.prepare(`
        UPDATE users
        SET eggs = ?, hearts = ?
        WHERE id = ?
      `).bind(newEggs, newHearts, user.id).run();
    
      return new Response(
        JSON.stringify({
          success: true,
          eggs: newEggs,
          hearts: newHearts,
          spent: totalCost,
          gained: heartsToBuy
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (url.pathname === "/duels/create-draft" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request)
        });
      }
    
      const body = await readJsonSafe(request);
      const entryTier = Number(body?.entry_tier || 0);
      const arenaSetup = body?.arena_setup || null;
    
      if (!isValidNominalDuelEntryTier(entryTier)) {
        console.error("invalid_entry_tier");
        return new Response(JSON.stringify({
          ok: false,
          error: "invalid_entry_tier: " + entryTier
        }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const lowTierLimit = await assertDailyDuelTierLimit(env, user.id, entryTier);

      if (!lowTierLimit.ok) {
        return new Response(JSON.stringify({
          ok: false,
          error: lowTierLimit.reason,
          message: `You have reached the daily limit for 1 PI duels (${lowTierLimit.limit} per day).`
        }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }

      if (!isValidArenaSetup(arenaSetup)) {
        console.error("invalid_arena_setup");
        return new Response(JSON.stringify({
          ok: false,
          error: "invalid_arena_setup"
        }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const cooldown = await assertDuelCreateCooldown(env, user.id);
      if (!cooldown.ok) {
        console.error("duel_create_cooldown");
        return new Response(JSON.stringify({
          ok: false,
          error: "duel_create_cooldown",
          retry_after_ms: cooldown.retry_after_ms
        }), {
          status: 429,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const economy = buildDuelEconomy(entryTier, env);
      const publicId = makeDuelPublicId();
    
      const expiresAt = new Date(Date.now() + DUEL_EXPIRE_HOURS * 60 * 60 * 1000).toISOString();
    
      const creatorSetupJson = {
        defense: {
          chicks: arenaSetup.chicks || []
        },
        attack_plan: arenaSetup.rockets || [],
        board_meta: {
          radius: 2,
          tile_count: Array.isArray(arenaSetup.rockets) ? arenaSetup.rockets.length : 0
        }
      };
    
      const insertRes = await env.DB.prepare(`
        INSERT INTO duels (
          public_id,
          status,
          creator_user_id,
          entry_tier_pi,
          nominal_entry_tier_pi,
          effective_entry_tier_pi,
          total_pot_pi,
          platform_fee_rate,
          platform_fee_pi,
          winner_reward_pi,
          creator_payment_status,
          creator_setup_json,
          expires_at
        ) VALUES (?, 'payment_pending', ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(
        publicId,
        user.id,
        economy.nominal_entry_tier_pi,   // entry_tier_pi viejo
        economy.nominal_entry_tier_pi,   // nominal_entry_tier_pi nuevo
        economy.effective_entry_tier_pi,
        economy.total_pot_pi,
        economy.platform_fee_rate,
        economy.platform_fee_pi,
        economy.winner_reward_pi,
        JSON.stringify(creatorSetupJson),
        expiresAt
      ).run();
    
      const duelId = insertRes?.meta?.last_row_id;
      if (!duelId) {
        return new Response(JSON.stringify({
          ok: false,
          error: "duel_insert_failed"
        }), {
          status: 500,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      //await insertDuelEvent(env, duelId, "duel_created", user.id, {
      //  public_id: publicId,
      //  entry_tier: economy.nominal_entry_tier_pi,
      //  effective_entry_tier_pi: economy.effective_entry_tier_pi
      //});

      await insertDuelEventAndFeed(env, duelId, "duel_created", user.id, {
        entry_tier_pi: economy.effective_entry_tier_pi,
        winner_reward_pi: economy.winner_reward_pi,
        public_id: publicId
      });
    
      await audit(env, request, {
        user_id: user.id,
        action: "DUEL_CREATE_DRAFT",
        outcome: "OK",
        meta: {
          duel_id: duelId,
          public_id: publicId,
          nominal_entry_tier_pi: economy.nominal_entry_tier_pi,
          effective_entry_tier_pi: economy.effective_entry_tier_pi
        }
      });
    
      console.error("all ok");

      return new Response(JSON.stringify({
        ok: true,
        duel: {
          id: duelId,
          public_id: publicId,
          status: "payment_pending",
          nominal_entry_tier_pi: economy.nominal_entry_tier_pi,
          effective_entry_tier_pi: economy.effective_entry_tier_pi,
          total_pot_pi: economy.total_pot_pi,
          winner_reward_pi: economy.winner_reward_pi,
          expires_at: expiresAt
        },
        payment: {
          amount_pi: economy.effective_entry_tier_pi,
          currency_code: "PI",
          note: env.ENV === "dev"
            ? "DEV payment mapping applied"
            : "Production payment amount"
        }
      }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/duels/open" && request.method === "GET") {
      await releaseExpiredDuelReservations(env);

      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const pageSize = Math.min(20, Number(url.searchParams.get("pageSize") || 10));
      const offset = (page - 1) * pageSize;
    
      const rows = await env.DB.prepare(`
        SELECT
          d.id,
          d.public_id,
          d.nominal_entry_tier_pi,
          d.winner_reward_pi,
          d.created_at,
          u.user_name,
          u.name,
          u.bird_color
        FROM duels d
        JOIN users u ON u.id = d.creator_user_id
        WHERE d.status = 'open'
          AND (d.reserve_expires_at IS NULL OR d.reserve_expires_at < datetime('now'))
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(pageSize, offset).all();
    
      return new Response(JSON.stringify({
        ok: true,
        items: rows.results || [],
        page,
        pageSize
      }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/duels/finished" && request.method === "GET") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request)
        });
      }
    
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const pageSize = Math.min(20, Number(url.searchParams.get("pageSize") || 10));
      const offset = (page - 1) * pageSize;
    
      const rows = await env.DB.prepare(`
        SELECT
          d.id,
          d.public_id,
          d.creator_user_id,
          d.challenger_user_id,
          d.winner_user_id,
          d.entry_tier_pi,
          d.nominal_entry_tier_pi,
          d.winner_reward_pi,
          d.resolved_at,
          d.created_at,
    
          CASE
            WHEN d.creator_user_id = ? THEN 
              uc.user_name
            ELSE 
              uu.user_name
          END AS opponent_name,
          CASE
            WHEN d.creator_user_id = ? THEN 
              uc.name
            ELSE 
              uu.name
          END AS opponent_name_real,
          CASE
            WHEN d.creator_user_id = ? THEN 
              uc.bird_color
            ELSE 
              uu.bird_color
          END AS opponent_bird_color,
    
          CASE
            WHEN d.winner_user_id = ? THEN 'win'
            ELSE 'loss'
          END AS result,
          uu.name AS creator_name,
          uc.name AS challenger_name,
          d.creator_setup_json,
          d.challenger_setup_json,
          uu.bird_color AS creator_bird_color,
          uc.bird_color AS challenger_bird_color
        FROM duels d
        LEFT JOIN users uc
          ON uc.id = d.challenger_user_id
        LEFT JOIN users uu
          ON uu.id = d.creator_user_id
        WHERE d.status = 'resolved'
          AND (d.creator_user_id = ? OR d.challenger_user_id = ?)
        ORDER BY COALESCE(d.resolved_at, d.created_at) DESC
        LIMIT ? OFFSET ?
      `).bind(
        user.id,
        user.id,
        user.id,
        user.id,
        user.id,
        user.id,
        pageSize,
        offset
      ).all();
    
      return new Response(JSON.stringify({
        ok: true,
        items: rows.results || [],
        page,
        pageSize
      }), {
        status: 200,
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json"
        }
      });
    }

    if (
      url.pathname.startsWith("/duels/") &&
      url.pathname.endsWith("/prepare-challenger") &&
      request.method === "POST"
    ) {
      const duelId = Number(url.pathname.split("/")[2]);
      const user = await requireUser(request, env);
      if (!user) return unauthorized();
    
      await releaseExpiredDuelReservations(env);
    
      const body = await readJsonSafe(request);
      const arenaSetup = body?.arena_setup || null;
    
      if (!isValidArenaSetup(arenaSetup)) {
        return new Response(JSON.stringify({
          ok: false,
          error: "invalid_arena_setup"
        }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const hasAnotherReservation = await userHasActiveDuelReservation(env, user.id);
      if (hasAnotherReservation) {
        return new Response(JSON.stringify({
          ok: false,
          error: "user_already_has_reserved_duel"
        }), {
          status: 409,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const duel = await env.DB.prepare(`
        SELECT
          d.id,
          d.public_id,
          d.status,
          d.creator_user_id,
          d.nominal_entry_tier_pi,
          d.effective_entry_tier_pi,
          d.winner_reward_pi,
          d.challenger_user_id,
          d.reserve_expires_at,
          u.user_name,
          u.name,
          u.bird_color
        FROM duels d
        JOIN users u ON u.id = d.creator_user_id
        WHERE d.id = ?
        LIMIT 1
      `).bind(duelId).first();
    
      if (!duel) {
        return new Response(JSON.stringify({
          ok: false,
          error: "duel_not_found"
        }), {
          status: 404,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      if(!isAdminUser(env, user.id)){
        if (String(duel.creator_user_id) === String(user.id)) {
          return new Response(JSON.stringify({
            ok: false,
            error: "cannot_accept_own_duel"
          }), {
            status: 400,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
      }
    
      if (duel.status !== "open") {
        return new Response(JSON.stringify({
          ok: false,
          error: "duel_not_available"
        }), {
          status: 409,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      const reserveMinutes = 10;
    
      const challengerSetupJson = {
        defense: {
          chicks: arenaSetup.chicks || []
        },
        attack_plan: arenaSetup.rockets || [],
        board_meta: {
          radius: 2,
          tile_count: Array.isArray(arenaSetup.rockets) ? arenaSetup.rockets.length : 0
        }
      };
    
      const result = await env.DB.prepare(`
        UPDATE duels
        SET
          status = 'reserved',
          challenger_user_id = ?,
          challenger_setup_json = ?,
          challenger_payment_status = 'pending',
          reserved_at = datetime('now'),
          reserve_expires_at = datetime('now', '+${reserveMinutes} minutes'),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status = 'open'
          AND challenger_user_id IS NULL
      `).bind(
        user.id,
        JSON.stringify(challengerSetupJson),
        duelId
      ).run();
    
      if (result.changes === 0) {
        return new Response(JSON.stringify({
          ok: false,
          error: "duel_not_available"
        }), {
          status: 409,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
    
      await insertDuelEvent(env, duelId, "duel_reserved", user.id, {
        reserve_minutes: reserveMinutes
      });
    
      await insertDuelEvent(env, duelId, "duel_challenger_setup_saved", user.id, {
        chicks: Array.isArray(arenaSetup.chicks) ? arenaSetup.chicks.length : 0,
        rockets: Array.isArray(arenaSetup.rockets) ? arenaSetup.rockets.length : 0
      });
    
      await audit(env, request, {
        user_id: user.id,
        action: "DUEL_PREPARE_CHALLENGER",
        outcome: "OK",
        meta: {
          duel_id: duelId,
          public_id: duel.public_id,
          reserve_minutes: reserveMinutes
        }
      });
    
      return new Response(JSON.stringify({
        ok: true,
        duel: {
          id: duel.id,
          public_id: duel.public_id,
          status: "reserved",
          nominal_entry_tier_pi: duel.nominal_entry_tier_pi,
          effective_entry_tier_pi: duel.effective_entry_tier_pi,
          winner_reward_pi: duel.winner_reward_pi,
          creator_name: duel.user_name || duel.name || "Unknown",
          creator_bird_color: duel.bird_color || "yellow"
        },
        reservation: {
          reserved: true,
          expires_in_minutes: reserveMinutes
        }
      }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }

    if (request.method === "GET" && url.pathname === "/activity/feed") {
      try {
        const url = new URL(request.url);
        const limitRaw = Number(url.searchParams.get("limit") || 20);
        const limit = Math.min(Math.max(limitRaw, 1), 50);
    
        const cursorRaw = url.searchParams.get("cursor");
        const cursor = cursorRaw ? Number(cursorRaw) : null;
    
        const cutoff = Math.floor(Date.now() / 1000) - (48 * 60 * 60);
    
        let query = `
        SELECT
          af.id,
          af.activity_type,
          af.actor_user_id,
          af.target_user_id,
          af.reference_table,
          af.reference_id,
          af.payload_json,
          af.priority,
          af.created_at,

          ua.name AS actor_name,
          ua.bird_color AS actor_bird_color,

          ut.name AS target_name,
          ut.bird_color AS target_bird_color

        FROM activity_feed af

        LEFT JOIN users ua ON ua.id = af.actor_user_id
        LEFT JOIN users ut ON ut.id = af.target_user_id

        WHERE af.visible = 1
          AND af.created_at >= ?
        `;
    
        const binds = [cutoff];
    
        if (cursor) {
          query += ` AND af.id < ? `;
          binds.push(cursor);
        }
    
        query += `
          ORDER BY af.id DESC
          LIMIT ?
        `;
        binds.push(limit + 1);
    
        const rows = await env.DB.prepare(query).bind(...binds).all();
        const results = Array.isArray(rows?.results) ? rows.results : [];
    
        const hasMore = results.length > limit;
        const items = hasMore ? results.slice(0, limit) : results;
    
        const mapped = items.map(row => ({
          id: row.id,
          activity_type: row.activity_type,
          actor_user_id: row.actor_user_id,
          target_user_id: row.target_user_id,
          actor_bird_color: row.actor_bird_color || null,
          target_name: row.target_name || "Unknown",
          target_bird_color: row.target_bird_color || null,
          actor_name: row.actor_name || "Unknown",
          payload: row.payload_json ? JSON.parse(row.payload_json) : null,
          created_at: row.created_at
        }));
    
        const nextCursor = hasMore ? items[items.length - 1].id : null;
    
        return new Response(JSON.stringify({
          ok: true,
          items: mapped,
          has_more: hasMore,
          next_cursor: nextCursor
        }), {
          status: 200,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({
          ok: false,
          error: "ACTIVITY_FEED_FAILED",
          message: err.message || "Failed to load activity feed"
        }), {
          status: 500,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
    }

    if (request.method === "GET" && url.pathname === "/arena-reward/pending") {
    
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request)
        });
      }
    
      const rows = await env.DB.prepare(`
        SELECT
          id,
          from_rank,
          to_rank,
          reward_coins,
          reward_spins,
          status,
          created_at
        FROM user_arena_rewards
        WHERE user_id = ?
          AND status = 'PENDING'
        ORDER BY created_at ASC
      `).bind(user.id).all();
    
      const items = Array.isArray(rows?.results) ? rows.results : [];
    
      const pending_rewards = items.map(item => {
        const rankLevel = getRankLevelByNumber(item.to_rank);
      
        return {
          ...item,
          to_rank_name: rankLevel?.name || null,
          to_rank_icon: rankLevel?.icon || "🔥"
        };
      });
    
      return new Response(JSON.stringify({
        ok: true,
        pending_rewards
      }), {
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json"
        }
      });
    }
    if (request.method === "POST" && url.pathname === "/arena-reward/claim") {
    
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(request)
        });
      }
    
      const body = await readJsonSafe(request);
      const rewardId = String(body?.reward_id || "").trim();
    
      if (!rewardId) {
        return new Response(JSON.stringify({
          ok: false,
          error: "missing_reward_id"
        }), {
          status: 400,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
    
      const reward = await env.DB.prepare(`
        SELECT *
        FROM user_arena_rewards
        WHERE id = ?
          AND user_id = ?
          AND status = 'PENDING'
        LIMIT 1
      `).bind(rewardId, user.id).first();
    
      if (!reward) {
        return new Response(JSON.stringify({
          ok: false,
          error: "reward_not_found_or_already_claimed"
        }), {
          status: 404,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
    
      const now = Date.now();
    
      const updateReward = await env.DB.prepare(`
        UPDATE user_arena_rewards
        SET status = 'CLAIMED',
            claimed_at = ?
        WHERE id = ?
          AND user_id = ?
          AND status = 'PENDING'
      `).bind(now, rewardId, user.id).run();
    
      if (!updateReward?.meta || updateReward.meta.changes !== 1) {
        return new Response(JSON.stringify({
          ok: false,
          error: "claim_conflict"
        }), {
          status: 409,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
    
      await env.DB.prepare(`
        UPDATE users
        SET eggs = eggs + ?,
            free_spins = free_spins + ?
        WHERE id = ?
      `).bind(
        Number(reward.reward_coins || 0),
        Number(reward.reward_spins || 0),
        user.id
      ).run();
    
      const updated = await env.DB.prepare(`
        SELECT eggs, free_spins
        FROM users
        WHERE id = ?
      `).bind(user.id).first();
    
      return new Response(JSON.stringify({
        ok: true,
        reward: {
          id: reward.id,
          from_rank: reward.from_rank,
          to_rank: reward.to_rank,
          reward_coins: reward.reward_coins,
          reward_spins: reward.reward_spins
        },
        eggs: updated?.eggs ?? 0,
        free_spins: updated?.free_spins ?? 0
      }), {
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/api/raffle/info") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
      }
    
      await env.DB.prepare(`
        INSERT OR IGNORE INTO season_jackpot (
          season_id,
          base_amount_pi,
          accumulated_pi,
          total_tickets,
          status
        ) VALUES (?, 50, 50, 0, 'open')
      `).bind(CURRENT_SEASON_ID).run();
    
      const jackpot = await env.DB.prepare(`
        SELECT accumulated_pi, total_tickets, status
        FROM season_jackpot
        WHERE season_id = ?
      `).bind(CURRENT_SEASON_ID).first();
    
      let myTickets = 0;
    
      if (user.id) {
        const row = await env.DB.prepare(`
          SELECT COUNT(*) AS c
          FROM season_raffle_tickets
          WHERE season_id = ?
            AND user_id = ?
        `).bind(CURRENT_SEASON_ID, user.id).first();
    
        myTickets = Number(row?.c || 0);
      }
    
      return new Response(JSON.stringify({
        success: true,
        seasonId: CURRENT_SEASON_ID,
        jackpotAmount: jackpot?.accumulated_pi || 50,
        totalTickets: jackpot?.total_tickets || 0,
        myTickets
      }), {
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json"
        }
      });
    }


    // ─────────────────────────────────────────────
    // POST /ads/pi/verify
    // Verifica un Pi Ad Network rewarded ad y
    // crea el ad_reward listo para consumir en /game/revive
    // ─────────────────────────────────────────────
    if (url.pathname === "/ads/pi/verify" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
      }

      const body = await readJsonSafe(request);
      const adId = String(body?.adId || "").trim();
      const rewardType = String(body?.rewardType || "revive").trim();

      // Validar input
      if (!adId) {
        return new Response(JSON.stringify({ ok: false, error: "adId_required" }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }

      // Evitar doble uso del mismo adId
      const existing = await env.DB.prepare(`
        SELECT id FROM ad_rewards
        WHERE provider = 'pi_network' AND tid = ?
        LIMIT 1
      `).bind(adId).first();

      if (existing) {
        await audit(env, request, {
          user_id: user.id,
          action: "PI_AD_VERIFY_REJECT",
          outcome: "REJECT",
          reason: "ALREADY_USED",
          meta: { adId }
        });
        return new Response(JSON.stringify({ ok: false, error: "adId_already_used" }), {
          status: 409,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }

      // Verificar con Pi Platform API
      let piStatus;
      try {
        const piRes = await fetch(
          `https://api.minepi.com/ads_network/status/${encodeURIComponent(adId)}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Key ${env.PI_SERVER_API_KEY}` // variable de entorno
            }
          }
        );

        if (!piRes.ok) {
          await audit(env, request, {
            user_id: user.id,
            action: "PI_AD_VERIFY_REJECT",
            outcome: "REJECT",
            reason: `PI_API_HTTP_${piRes.status}`,
            meta: { adId }
          });
          return new Response(JSON.stringify({ ok: false, error: "pi_api_error", status: piRes.status }), {
            status: 502,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }

        piStatus = await piRes.json();
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "pi_api_unreachable" }), {
          status: 502,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }

      // ⚠️ SOLO "granted" es válido — nunca confiar en el frontend
      if (piStatus?.mediator_ack_status !== "granted") {
        await audit(env, request, {
          user_id: user.id,
          action: "PI_AD_VERIFY_REJECT",
          outcome: "REJECT",
          reason: "NOT_GRANTED",
          meta: { adId, mediator_ack_status: piStatus?.mediator_ack_status }
        });
        return new Response(JSON.stringify({
          ok: false,
          error: "ad_not_granted",
          mediator_ack_status: piStatus?.mediator_ack_status
        }), {
          status: 403,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }

      // ✅ Ad verificado — crear el ad_reward para consumir en /game/revive
      const tid = makeTid("piad"); // reutiliza tu función existente
      const now = Date.now();

      await env.DB.prepare(`
        INSERT INTO ad_rewards (
          id, provider, reward_type, tid, user_id, status,
          payload_json, rewarded_at, created_at
        ) VALUES (?, 'pi_network', ?, ?, ?, 'rewarded', ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        rewardType,
        tid,
        user.id,
        JSON.stringify({ adId, mediator_ack_status: "granted" }),
        now,
        now
      ).run();

      await audit(env, request, {
        user_id: user.id,
        action: "PI_AD_VERIFY_OK",
        outcome: "OK",
        meta: { adId, tid, rewardType }
      });

      return new Response(JSON.stringify({ ok: true, tid }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }

    if (request.method === "GET" && url.pathname === "/attack/targets") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
      }

      return handleAttackTargets(request, env, user.id);
    }

    if (request.method === "POST" && url.pathname === "/attack/execute") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
      }

      return handleAttackExecute(request, env, user.id);
    }

    if (request.method === "POST" && url.pathname === "/attack/buy-extra") {
      const user = await requireUser(request, env);
      if (!user) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
      }

      return handleBuyExtraAttacks(request, env, user.id);
    }

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    // 🔥 EVITA CORS FANTASMA 🔥
    if (err instanceof Response) {
      return new Response(err.body, {
        status: err.status,
        headers: corsHeaders(request),
      });
    } 

    const errorInfo = {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      cause: err?.cause,
    };

    return new Response("Internal Server Error" + JSON.stringify(errorInfo, null, 2), {
      status: 500,
      headers: corsHeaders(request),
    });
  }
},

async queue(batch, env) {
  await consumeGamePointsBatch(
    batch,
    env
  );
}

};
async function verifyPiAccessToken(accessToken, env) {
  const res = await fetch("https://api.minepi.com/v2/me", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "X-API-Key": env.PI_API_KEY
    }
  });

  if (!res.ok) {
    return null;
  }

  return await res.json();
}

async function verifyTurnstileToken({ token, request, env }) {
  if (!token) return { ok: false, code: "TS_MISSING" };

  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    undefined;

  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });

  const data = await resp.json().catch(() => null);

  if (!data?.success) {
    return { ok: false, code: "TS_INVALID", details: data?.["error-codes"] || [] };
  }

  return { ok: true, data };
}

function getUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function jsonResponse(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(request),
  });
}

function errorResponse(request, error, status = 400, extra = {}) {
  return new Response(JSON.stringify({
    ok: false,
    error,
    ...extra
  }), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json"
    }
  });
}

function calcStealPreview(targetFlames, targetRank) {
  const flames = Number(targetFlames || 0);
  const rank = Number(targetRank || 999999);

  if (flames < MIN_FLAMES_TO_BE_ATTACKABLE) return 0;

  let pct = 0.008;

  if (rank <= 10) pct = 0.008;
  else if (rank > 100) pct = 0.008;

  const raw = Math.floor(flames * pct);
  return Math.max(1, Math.min(MAX_STEAL, raw));
}

function getAttackSuccessRate(targetRank) {
  const rank = Number(targetRank || 999999);

  // Top 10 más protegidos
  if (rank <= 10) return 0.50;

  // Del 11 al 100 probabilidad media
  if (rank <= 100) return 0.60;

  // Más abajo son más vulnerables
  return 0.80;
}

function rollAttackSuccess(targetRank) {
  const successRate = getAttackSuccessRate(targetRank);
  return Math.random() < successRate;
}

function getAttackResultMessage(result, stolenFinal = 0, targetName = "the target") {
  if (result === "hit") {
    return `🔥 Successful attack! You stole ${stolenFinal} flames from ${targetName}.`;
  }

  if (result === "miss") {
    return `💨 Your attack failed! ${targetName} escaped this time.`;
  }

  return `⚔️ Attack resolved.`;
}

async function getDailyAttackRow(db, userId, attackDateUtc) {
  try {
    return await db.prepare(`
      SELECT *
      FROM user_attack_daily
      WHERE user_id = ? AND attack_date_utc = ?
    `).bind(userId, attackDateUtc).first();
  } catch (err) {
    console.error("getDailyAttackRow error", err);
    throw err;
  }
}

async function getDailyReceiveRow(db, userId, attackDateUtc) {
  try {
    return await db.prepare(`
      SELECT *
      FROM user_attack_received_daily
      WHERE user_id = ? AND attack_date_utc = ?
    `).bind(userId, attackDateUtc).first();
  } catch (err) {
    console.error("getDailyReceiveRow error", err);
    throw err;
  }
}

async function ensureDailyAttackRow(db, userId, attackDateUtc) {
  try {
    await db.prepare(`
      INSERT OR IGNORE INTO user_attack_daily (
        user_id, attack_date_utc, attacks_done, base_attack_limit, extra_attacks_purchased, created_at, updated_at
      )
      VALUES (?, ?, 0, 10, 0, datetime('now'), datetime('now'))
    `).bind(userId, attackDateUtc).run();
  } catch (err) {
    console.error("ensureDailyAttackRow error", err);
    throw err;
  }
}

async function ensureDailyReceiveRow(db, userId, attackDateUtc) {
  try {
    await db.prepare(`
      INSERT OR IGNORE INTO user_attack_received_daily (
        user_id, attack_date_utc, attacks_received, receive_attack_limit, created_at, updated_at
      )
      VALUES (?, ?, 0, 10, datetime('now'), datetime('now'))
    `).bind(userId, attackDateUtc).run();
  } catch (err) {
    console.error("ensureDailyReceiveRow error", err);
    throw err;
  }
}

async function handleAttackTargets(request, env, userId) {
  try {
    const db = env.DB;
    const attackDateUtc = getUtcDate();
    
    const user = await requireUser(request, env);
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("page_size") || 10)));
    const offset = (page - 1) * pageSize;

    await ensureDailyAttackRow(db, userId, attackDateUtc);
    const myDailyRow = await getDailyAttackRow(db, userId, attackDateUtc);

    const attacksLeftToday =
      (Number(myDailyRow?.base_attack_limit || 10) + Number(myDailyRow?.extra_attacks_purchased || 0)) -
      Number(myDailyRow?.attacks_done || 0);

    const totalRow = await db.prepare(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE total_score >= ?
    `).bind(50).first();

    const playersResult = await db.prepare(`
      SELECT
        users.id,
        users.name,
        users.bird_color,
        users.total_score AS flames,
        users.max_score AS best_score,
        user_attack_received_daily.attacks_received as attacks_received,
        user_attack_received_daily.receive_attack_limit as receive_attack_limit
      FROM users
      LEFT JOIN user_attack_received_daily ON user_attack_received_daily.user_id = users.id AND attack_date_utc = ?
      WHERE users.total_score >= ?
      ORDER BY users.total_score DESC, users.created_at ASC
      LIMIT ? OFFSET ?
    `).bind(attackDateUtc, 50, pageSize, offset).all();

    const rows = playersResult?.results || [];
    const items = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rank = offset + i + 1;
      //await ensureDailyReceiveRow(db, row.id, attackDateUtc);
      //const receiveRow = await getDailyReceiveRow(db, row.id, attackDateUtc);

      const attacksReceivedToday = Number(row.attacks_received || 0);
      const receiveLimit = Number(row.receive_attack_limit || 10);
      const stealPreview = calcStealPreview(row.flames, rank);

      const canAttack =
        attacksLeftToday > 0 &&
        attacksReceivedToday < receiveLimit &&
        row.flames >= MIN_FLAMES_TO_BE_ATTACKABLE &&
        stealPreview > 0 &&
        user.total_score >= MIN_FLAMES_TO_BE_ATTACKABLE;

      items.push({
        user_id: row.id,
        name: row.name,
        bird_color: row.bird_color || "yellow",
        rank,
        flames: Number(row.flames),
        best_score: Number(row.best_score),
        steal_preview: stealPreview,
        attacks_received_today: attacksReceivedToday,
        can_attack: canAttack
      });
    }


    return new Response(JSON.stringify({
      ok: true,
      page,
      page_size: pageSize,
      total: Number(totalRow?.total || 0),
      attacks_left_today: Math.max(0, attacksLeftToday),
      extra_attacks_purchased: myDailyRow?.extra_attacks_purchased,
      items
    }), {
      status: 200,
      headers: { ...corsHeaders(request), "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("handleAttackTargets error", err);

    return errorResponse(request, "ATTACK_TARGETS_FAILED", 500, {
      message: String(err?.message || err)
    });
  }
}

async function handleAttackExecute(request, env, userId) {
  try {
    const db = env.DB;
    const attackDateUtc = getUtcDate();
    const body = await request.json();
    const targetUserId = body?.target_user_id;

    if (!targetUserId || targetUserId === userId) {
      return errorResponse(request, "INVALID_TARGET", 400, {
        message: "❌ Invalid target selected."
      });
    }

    await ensureDailyAttackRow(db, userId, attackDateUtc);
    await ensureDailyAttackRow(db, targetUserId, attackDateUtc);
    await ensureDailyReceiveRow(db, targetUserId, attackDateUtc);

    const myDailyRow = await getDailyAttackRow(db, userId, attackDateUtc);
    const targetReceiveRow = await getDailyReceiveRow(db, targetUserId, attackDateUtc);

    const myLimit =
      Number(myDailyRow?.base_attack_limit || 10) +
      Number(myDailyRow?.extra_attacks_purchased || 0);

    const myDone = Number(myDailyRow?.attacks_done || 0);

    if (myDone >= myLimit) {
      return errorResponse(request, "DAILY_ATTACK_LIMIT_REACHED", 400, {
        message: "🛑 You have used all your attacks for today."
      });
    }

    const targetReceived = Number(targetReceiveRow?.attacks_received || 0);
    const targetReceiveLimit = Number(targetReceiveRow?.receive_attack_limit || 10);

    if (targetReceived >= targetReceiveLimit) {
      return errorResponse(request, "TARGET_DAILY_RECEIVE_LIMIT_REACHED", 400, {
        message: "🛡️ This player cannot receive more attacks today."
      });
    }

    const attacker = await db.prepare(`
      SELECT id, name, total_score
      FROM users
      WHERE id = ?
    `).bind(userId).first();

    const target = await db.prepare(`
      SELECT
        id,
        name,
        bird_color,
        total_score,
        ROW_NUMBER() OVER (ORDER BY total_score DESC, created_at ASC) AS rank
      FROM users
      WHERE id = ?
    `).bind(targetUserId).first();

    if (!attacker || !target) {
      return errorResponse(request, "USER_NOT_FOUND", 404, {
        message: "👤 Target not found."
      });
    }

    const targetFlamesBefore = Number(target.total_score || 0);
    const attackerFlamesBefore = Number(attacker.total_score || 0);

    if (targetFlamesBefore < MIN_FLAMES_TO_BE_ATTACKABLE) {
      return errorResponse(request, "TARGET_TOO_LOW", 400, {
        message: "🌱 This player does not have enough flames to be attacked."
      });
    }

    const stolenPreview = calcStealPreview(targetFlamesBefore, target.rank);

    if (stolenPreview <= 0) {
      return errorResponse(request, "NOTHING_TO_STEAL", 400, {
        message: "🪹 There is nothing to steal from this target."
      });
    }

    const success = rollAttackSuccess(target.rank);

    if (!success) {
      await db.prepare(`
        UPDATE user_attack_daily
        SET attacks_done = attacks_done + 1,
            updated_at = datetime('now')
        WHERE user_id = ? AND attack_date_utc = ?
      `).bind(userId, attackDateUtc).run();

      await db.prepare(`
        UPDATE user_attack_received_daily
        SET attacks_received = attacks_received + 1,
            updated_at = datetime('now')
        WHERE user_id = ? AND attack_date_utc = ?
      `).bind(targetUserId, attackDateUtc).run();

      await db.prepare(`
        INSERT INTO attack_logs (
          attacker_user_id,
          target_user_id,
          attack_date_utc,
          result,
          stolen_preview,
          stolen_final,
          target_flames_before,
          target_flames_after,
          attacker_flames_before,
          attacker_flames_after,
          created_at
        )
        VALUES (?, ?, ?, 'miss', ?, 0, ?, ?, ?, ?, datetime('now'))
      `).bind(
        userId,
        targetUserId,
        attackDateUtc,
        stolenPreview,
        targetFlamesBefore,
        targetFlamesBefore,
        attackerFlamesBefore,
        attackerFlamesBefore
      ).run();

      const missLogRow = await db.prepare(`
        SELECT last_insert_rowid() AS id
      `).first();
      
      await insertActivityFeed(env, {
        activityType: "attack_miss",
        actorUserId: userId,
        targetUserId: targetUserId,
        referenceTable: "attack_logs",
        referenceId: missLogRow?.id || null,
        payload: {
          result: "miss",
          stolen_preview: stolenPreview
        },
        priority: 1
      });

      return new Response(JSON.stringify({
        ok: true,
        result: "miss",
        stolen: 0,
        attacker_flames_after: attackerFlamesBefore,
        target_flames_after: targetFlamesBefore,
        attacks_left_today: Math.max(0, myLimit - (myDone + 1)),
        target_name: target.name,
        message: `💨 Your attack failed! ${target.name} escaped this time.`
      }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }

    const stolenFinal = Math.min(stolenPreview, targetFlamesBefore);

    if (stolenFinal <= 0) {
      return errorResponse(request, "NOTHING_TO_STEAL", 400, {
        message: "🪹 There is nothing to steal from this target."
      });
    }

    const targetFlamesAfter = targetFlamesBefore - stolenFinal;
    const attackerFlamesAfter = attackerFlamesBefore + stolenFinal;

    await db.prepare(`
      UPDATE users
      SET total_score = ?
      WHERE id = ?
    `).bind(targetFlamesAfter, targetUserId).run();

    await db.prepare(`
      UPDATE users
      SET total_score = ?
      WHERE id = ?
    `).bind(attackerFlamesAfter, userId).run();

    await db.prepare(`
      UPDATE user_attack_daily
      SET attacks_done = attacks_done + 1,
          updated_at = datetime('now')
      WHERE user_id = ? AND attack_date_utc = ?
    `).bind(userId, attackDateUtc).run();

    await db.prepare(`
      UPDATE user_attack_received_daily
      SET attacks_received = attacks_received + 1,
          updated_at = datetime('now')
      WHERE user_id = ? AND attack_date_utc = ?
    `).bind(targetUserId, attackDateUtc).run();

    await db.prepare(`
      INSERT INTO attack_logs (
        attacker_user_id,
        target_user_id,
        attack_date_utc,
        result,
        stolen_preview,
        stolen_final,
        target_flames_before,
        target_flames_after,
        attacker_flames_before,
        attacker_flames_after,
        created_at
      )
      VALUES (?, ?, ?, 'hit', ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      userId,
      targetUserId,
      attackDateUtc,
      stolenPreview,
      stolenFinal,
      targetFlamesBefore,
      targetFlamesAfter,
      attackerFlamesBefore,
      attackerFlamesAfter
    ).run();

    const hitLogRow = await db.prepare(`
      SELECT last_insert_rowid() AS id
    `).first();
    
    await insertActivityFeed(env, {
      activityType: "attack_hit",
      actorUserId: userId,
      targetUserId: targetUserId,
      referenceTable: "attack_logs",
      referenceId: hitLogRow?.id || null,
      payload: {
        result: "hit",
        stolen_preview: stolenPreview,
        stolen_final: stolenFinal,
        attacker_flames_after: attackerFlamesAfter,
        target_flames_after: targetFlamesAfter
      },
      priority: 3
    });

    return new Response(JSON.stringify({
      ok: true,
      result: "hit",
      attacker_flames_after: attackerFlamesAfter,
      target_flames_after: targetFlamesAfter,
      attacks_left_today: Math.max(0, myLimit - (myDone + 1)),
      target_name: target.name,
      stolen: stolenFinal,
      message: `🔥 Successful attack! You stole ${stolenFinal} flames from ${target.name}.`
    }), {
      status: 200,
      headers: { ...corsHeaders(request), "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("handleAttackExecute error", err);
    return errorResponse(request, "ATTACK_EXECUTION_FAILED", 500, {
      message: String(err?.message || err)
    });
  }
}

async function handleBuyExtraAttacks(request, env, userId) {
  try {
    const db = env.DB;
    const attackDateUtc = getUtcDate();
    const body = await request.json();

    const quantity = Number(body?.quantity || 5);
    const coinCost = Number(body?.coin_cost || 5);

    if (quantity <= 0 || coinCost <= 0) {
      return errorResponse(request, "INVALID_PURCHASE", 400);
    }

    await ensureDailyAttackRow(db, userId, attackDateUtc);

    const user = await db.prepare(`
      SELECT id, COALESCE(eggs, 0) AS eggs
      FROM users
      WHERE id = ?
    `).bind(userId).first();

    if (!user) {
      return errorResponse(request, "USER_NOT_FOUND", 404);
    }

    const currentCoins = Number(user.eggs || 0);

    if (currentCoins < coinCost) {
      return errorResponse(request, "NOT_ENOUGH_COINS", 400, {
        coins: currentCoins
      });
    }

    const dailyRowTMP = await getDailyAttackRow(db, userId, attackDateUtc);

    const purchased = Number(dailyRowTMP?.extra_attacks_purchased || 0);

    if (purchased > 0) {
      return errorResponse(request, "EXTRA_ALREADY_PURCHASED_TODAY", 400, {
        message: "🛑 Extra attacks already purchased today."
      });
    }

    if (currentCoins < EXTRA_ATTACK_COST) {
      return errorResponse(request, "NOT_ENOUGH_COINS", 400, {
        message: "💰 Not enough coins."
      });
    }

    await db.prepare(`
      UPDATE users
      SET eggs = eggs - ?
      WHERE id = ?
    `).bind(coinCost, userId).run();

    await db.prepare(`
      UPDATE user_attack_daily
      SET extra_attacks_purchased = extra_attacks_purchased + ?,
          updated_at = datetime('now')
      WHERE user_id = ? AND attack_date_utc = ?
    `).bind(quantity, userId, attackDateUtc).run();

    const dailyRow = await getDailyAttackRow(db, userId, attackDateUtc);

    const totalLimit =
      Number(dailyRow?.base_attack_limit || 10) +
      Number(dailyRow?.extra_attacks_purchased || 0);

    const attacksDone = Number(dailyRow?.attacks_done || 0);

    await insertActivityFeed(env, {
      activityType: "buy_attacks",
      actorUserId: user.id,
      referenceTable: "user_attack_daily", // o la tabla que corresponda
      referenceId: null,
      payload: {
        extra_attacks: Number(quantity || 0),
        coins_spent: Number(coinCost || 0)
      },
      priority: 2  // medio (debajo de hit/duel_won)
    });
    
    return new Response(JSON.stringify({
      ok: true,
      bought: quantity,
      cost: coinCost,
      attacks_left_today: Math.max(0, totalLimit - attacksDone)
    }), {
      status: 200,
      headers: { ...corsHeaders(request), "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("handleBuyExtraAttacks error", err);
    return errorResponse(request, "BUY_EXTRA_ATTACKS_FAILED", 500, {
      message: String(err?.message || err)
    });
  }
}

async function assertDailyDuelTierLimit(env, userId, entryTier) {
  const entry = Number(entryTier);

  const tierLimits = {
    1: 3//,
    //5: 5
  };

  const limit = tierLimits[entry];
  if (!limit) {
    return { ok: true };
  }

  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM duels
    WHERE creator_user_id = ?
      AND nominal_entry_tier_pi = ?
      AND status IN ('payment_pending', 'open', 'reserved', 'locked', 'resolved')
      AND datetime(created_at) >= datetime('now', 'start of day')
      AND datetime(created_at) < datetime('now', 'start of day', '+1 day')
  `).bind(userId, entry).first();

  const total = Number(row?.total || 0);

  if (total >= limit) {
    return {
      ok: false,
      //reason: "daily_duel_tier_limit_reached",
      reason:`You've reached today's limit for 1 PI duels (${limit}). Come back tomorrow and keep battling! 🚀`,
      limit,
      total,
      entry_tier: entry
    };
  }

  return { ok: true, limit, total, entry_tier: entry };
}

/* =========================================================
   PI PRICE HELPERS
========================================================= */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidPiUsdPrice(value) {
  const price = Number(value);

  return Number.isFinite(price) && price > 0 && price < 10000;
}

function getValidManualPiPrice() {
  if (!isValidPiUsdPrice(PI_PRICE_FALLBACK_USD)) {
    throw new Error("INVALID_MANUAL_PI_PRICE");
  }

  return Number(PI_PRICE_FALLBACK_USD);
}

function getPiPriceFromMemoryCache() {
  if (!piPriceMemoryCache) {
    return null;
  }

  if (Date.now() >= piPriceMemoryCache.expires_at_ms) {
    piPriceMemoryCache = null;
    return null;
  }

  return {
    ...piPriceMemoryCache.value,
    cache_hit: true,
    cache_layer: "worker-memory"
  };
}

function savePiPriceInMemoryCache(value, ttlSeconds) {
  piPriceMemoryCache = {
    value,
    expires_at_ms: Date.now() + (Number(ttlSeconds) * 1000)
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/* =========================================================
   COINGECKO API
========================================================= */

async function fetchPiPriceFromCoinGeckoApi(env) {
  const apiKey = String(
    env?.COINGECKO_DEMO_API_KEY || ""
  ).trim();

  if (!apiKey) {
    throw new Error(
      "COINGECKO_DEMO_API_KEY_MISSING"
    );
  }

  const response = await fetchWithTimeout(
    PI_PRICE_URL,
    {
      method: "GET",

      headers: {
        "Accept": "application/json",
        "x-cg-demo-api-key": apiKey
      },

      cf: {
        cacheEverything: true,

        cacheTtlByStatus: {
          "200-299":
            PI_PRICE_CACHE_TTL_SECONDS,

          "400-499":
            0,

          "500-599":
            0
        }
      }
    },
    PI_PRICE_REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorBody = await response
      .text()
      .catch(() => "");

    throw new Error(
      `COINGECKO_API_HTTP_${response.status}: ` +
      errorBody.slice(0, 300)
    );
  }

  const data = await response.json();
  const piData = data?.["pi-network"];

  const price = Number(piData?.usd);

  const updatedAt = Number(
    piData?.last_updated_at || 0
  );

  if (!isValidPiUsdPrice(price)) {
    throw new Error(
      "COINGECKO_API_INVALID_PI_PRICE"
    );
  }

  const nowSeconds =
    Math.floor(Date.now() / 1000);

  if (
    updatedAt > 0 &&
    nowSeconds - updatedAt >
      PI_PRICE_MAX_PROVIDER_AGE_SECONDS
  ) {
    throw new Error(
      "COINGECKO_API_STALE_PI_PRICE"
    );
  }

  return {
    price_usd: price,
    source: "coingecko-api",
    updated_at: updatedAt || null,
    fallback: false,
    cache_hit: false,
    cache_layer: "cloudflare-fetch",
    obtained_at: Date.now()
  };
}

/* =========================================================
   COINGECKO HTML SCRAPING - OPCIONAL
========================================================= */

async function scrapePiPriceUsd() {
  const response = await fetchWithTimeout(
    PI_PRICE_PAGE_URL,
    {
      method: "GET",
      headers: {
        "Accept": "text/html",
        "User-Agent": "Mozilla/5.0 FlappyPi/1.0"
      },
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
          "200-299": PI_PRICE_CACHE_TTL_SECONDS,
          "400-499": 0,
          "500-599": 0
        }
      }
    },
    PI_PRICE_REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(
      `COINGECKO_PAGE_HTTP_${response.status}`
    );
  }

  const html = await response.text();

  const match = html.match(
    /PI Price[\s\S]{0,1500}?\$([0-9]+(?:\.[0-9]+)?)/i
  );

  if (!match) {
    throw new Error(
      "COINGECKO_PAGE_PRICE_NOT_FOUND"
    );
  }

  const price = Number(match[1]);

  if (!isValidPiUsdPrice(price)) {
    throw new Error(
      "COINGECKO_PAGE_INVALID_PI_PRICE"
    );
  }

  return {
    price_usd: price,
    source: "coingecko-html",
    updated_at: null,
    fallback: false,
    cache_hit: false,
    cache_layer: "cloudflare-fetch",
    obtained_at: Date.now()
  };
}

/* =========================================================
   OBTENER PRECIO FINAL DE PI
========================================================= */

async function getPiPriceUsd(env) {
  const cachedPrice = getPiPriceFromMemoryCache();

  if (cachedPrice) {
    return cachedPrice;
  }

  const errors = [];

  for (
    let attempt = 1;
    attempt <= PI_PRICE_MAX_ATTEMPTS;
    attempt++
  ) {
    try {
      const result =
        await fetchPiPriceFromCoinGeckoApi(env);

      const finalResult = {
        ...result,
        attempts: attempt,
        errors: []
      };

      savePiPriceInMemoryCache(
        finalResult,
        PI_PRICE_CACHE_TTL_SECONDS
      );

      return finalResult;
    } catch (error) {
      const message = String(
        error?.message || error
      );

      errors.push(message);

      console.warn(
        `[PI PRICE] CoinGecko API attempt ${attempt} failed:`,
        message
      );

      if (attempt < PI_PRICE_MAX_ATTEMPTS) {
        await sleep(PI_PRICE_RETRY_DELAY_MS);
      }
    }
  }

  if (PI_PRICE_ENABLE_HTML_SCRAPE_FALLBACK) {
    try {
      const scrapedResult =
        await scrapePiPriceUsd();

      const finalResult = {
        ...scrapedResult,
        attempts: PI_PRICE_MAX_ATTEMPTS,
        errors
      };

      savePiPriceInMemoryCache(
        finalResult,
        PI_PRICE_CACHE_TTL_SECONDS
      );

      return finalResult;
    } catch (error) {
      const message = String(
        error?.message || error
      );

      errors.push(message);

      console.warn(
        "[PI PRICE] CoinGecko HTML fallback failed:",
        message
      );
    }
  }

  const fallbackResult = {
    price_usd: getValidManualPiPrice(),
    source: "manual-fallback",
    updated_at: null,
    fallback: true,
    cache_hit: false,
    cache_layer: "worker-memory",
    obtained_at: Date.now(),
    attempts: PI_PRICE_MAX_ATTEMPTS,
    errors
  };

  savePiPriceInMemoryCache(
    fallbackResult,
    PI_PRICE_FALLBACK_CACHE_TTL_SECONDS
  );

  return fallbackResult;
}

/* =========================================================
   FLAPPYCOIN SHOP HELPERS
========================================================= */

function convertUsdCentsToPi(
  usdCents,
  piUsdPrice
) {
  const safeUsdCents = Number(usdCents);
  const safePiUsdPrice = Number(piUsdPrice);

  if (
    !Number.isInteger(safeUsdCents) ||
    safeUsdCents <= 0
  ) {
    throw new Error("INVALID_USD_CENTS");
  }

  if (!isValidPiUsdPrice(safePiUsdPrice)) {
    throw new Error("INVALID_PI_USD_PRICE");
  }

  const usdPrice = safeUsdCents / 100;
  const rawPiAmount = usdPrice / safePiUsdPrice;

  const amountPi =
    Math.ceil(
      (rawPiAmount - Number.EPSILON) * 100
    ) / 100;

  return Number(amountPi.toFixed(2));
}

function getFlappyCoinPack(packId) {
  const safePackId =
    String(packId || "").trim();

  return FLAPPYCOIN_PACKS.find(pack => {
    return (
      pack.id === safePackId &&
      pack.enabled === true
    );
  }) || null;
}

function buildFlappyCoinCatalog(piPriceData) {
  const piUsdPrice =
    Number(piPriceData?.price_usd);

  if (!isValidPiUsdPrice(piUsdPrice)) {
    throw new Error(
      "INVALID_CATALOG_PI_PRICE"
    );
  }

  const enabledPacks = FLAPPYCOIN_PACKS
    .filter(pack => pack.enabled === true)
    .sort((a, b) => a.sort - b.sort);

  if (enabledPacks.length === 0) {
    throw new Error(
      "FLAPPYCOIN_CATALOG_EMPTY"
    );
  }

  const starterPack = enabledPacks[0];
  const starterUsdPrice =
    starterPack.usd_cents / 100;

  const starterCoinsPerUsd =
    starterPack.coins / starterUsdPrice;

  const convertedPacks =
    enabledPacks.map(pack => {
      const usdPrice = Number(
        (pack.usd_cents / 100).toFixed(2)
      );

      const amountPi =
        convertUsdCentsToPi(
          pack.usd_cents,
          piUsdPrice
        );

      const coinsPerUsd =
        pack.coins / usdPrice;

      const valueBonusPct = Math.max(
        0,
        Math.round(
          (
            (
              coinsPerUsd /
              starterCoinsPerUsd
            ) - 1
          ) * 100
        )
      );

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
        coins_per_usd:
          Math.round(coinsPerUsd),
        value_bonus_pct:
          valueBonusPct
      };
    });

  const packsById = new Map(
    convertedPacks.map(pack => [
      pack.id,
      pack
    ])
  );

  const packsWithUpsell =
    convertedPacks.map(pack => {
      const previousPack =
        pack.compare_to
          ? packsById.get(pack.compare_to)
          : null;

      if (!previousPack) {
        return {
          ...pack,
          upsell: null
        };
      }

      return {
        ...pack,
        upsell: {
          compared_to:
            previousPack.id,

          compared_to_name:
            previousPack.name,

          extra_usd:
            Number(
              (
                pack.usd_price -
                previousPack.usd_price
              ).toFixed(2)
            ),

          extra_pi:
            Number(
              (
                pack.amount_pi -
                previousPack.amount_pi
              ).toFixed(2)
            ),

          extra_coins:
            pack.coins -
            previousPack.coins,

          extra_spins:
            pack.spins -
            previousPack.spins,

          price_increase_pct:
            Math.round(
              (
                (
                  pack.usd_price /
                  previousPack.usd_price
                ) - 1
              ) * 100
            ),

          coins_increase_pct:
            Math.round(
              (
                (
                  pack.coins /
                  previousPack.coins
                ) - 1
              ) * 100
            )
        }
      };
    });

  return {
    ok: true,

    catalog_version:
      FLAPPYCOIN_CATALOG_VERSION,

    recommended_pack_id:
      FLAPPYCOIN_RECOMMENDED_PACK_ID,

    base_currency:
      "USD",

    payment_currency:
      "PI",

    pi_usd_price:
      piUsdPrice,

    price_source:
      piPriceData.source,

    price_fallback:
      piPriceData.fallback === true,

    price_updated_at:
      piPriceData.updated_at ?? null,

    price_obtained_at:
      piPriceData.obtained_at ?? Date.now(),

    price_cache_hit:
      piPriceData.cache_hit === true,

    price_cache_layer:
      piPriceData.cache_layer || null,

    price_attempts:
      Number(piPriceData.attempts || 1),

    price_errors:
      Array.isArray(piPriceData.errors)
        ? piPriceData.errors
        : [],

    conversion_formula:
      "USD / PI_USD, rounded_up_to_2_decimals",

    generated_at:
      Date.now(),

    packs:
      packsWithUpsell
  };
}