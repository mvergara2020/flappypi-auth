var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-ofgXX7/checked-fetch.js
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

// levels.js
var RANK_LEVELS = [
  { rank: 1, icon: "\u{1F95A}", name: "Newborn Spark", flamesRequired: 0 },
  { rank: 2, icon: "\u{1F423}", name: "First Hatch", flamesRequired: 100 },
  { rank: 3, icon: "\u{1F331}", name: "Tiny Grower", flamesRequired: 250 },
  { rank: 4, icon: "\u{1F343}", name: "Light Drifter", flamesRequired: 470 },
  { rank: 5, icon: "\u{1F425}", name: "Soft Runner", flamesRequired: 790 },
  { rank: 6, icon: "\u{1F324}\uFE0F", name: "Dawn Seeker", flamesRequired: 1240 },
  { rank: 7, icon: "\u{1F9ED}", name: "Path Finder", flamesRequired: 1840 },
  { rank: 8, icon: "\u{1FAB6}", name: "Feather Glide", flamesRequired: 2640 },
  { rank: 9, icon: "\u{1F3C3}", name: "Quick Starter", flamesRequired: 3690 },
  { rank: 10, icon: "\u{1F525}", name: "Flame Touch", flamesRequired: 5040 },
  { rank: 11, icon: "\u{1F4AB}", name: "Spark Chaser", flamesRequired: 6740 },
  { rank: 12, icon: "\u26A1", name: "Fast Reflex", flamesRequired: 8840 },
  { rank: 13, icon: "\u{1F3AF}", name: "Sharp Aim", flamesRequired: 11440 },
  { rank: 14, icon: "\u{1F6E1}\uFE0F", name: "Guarded Mind", flamesRequired: 14640 },
  { rank: 15, icon: "\u{1F9F1}", name: "Solid Step", flamesRequired: 18540 },
  { rank: 16, icon: "\u{1F30A}", name: "Flow Rider", flamesRequired: 23240 },
  { rank: 17, icon: "\u{1F300}", name: "Spin Control", flamesRequired: 28840 },
  { rank: 18, icon: "\u{1F680}", name: "Lift Off", flamesRequired: 35440 },
  { rank: 19, icon: "\u{1F31F}", name: "Bright Path", flamesRequired: 43140 },
  { rank: 20, icon: "\u{1F536}", name: "Rising Chick", flamesRequired: 52040 },
  { rank: 21, icon: "\u{1F9E0}", name: "Mind Builder", flamesRequired: 62540 },
  { rank: 22, icon: "\u2699\uFE0F", name: "System Learner", flamesRequired: 74240 },
  { rank: 23, icon: "\u{1F517}", name: "Chain Master", flamesRequired: 87240 },
  { rank: 24, icon: "\u{1FA9C}", name: "Step Climber", flamesRequired: 101640 },
  { rank: 25, icon: "\u{1F3F9}", name: "Precision Shot", flamesRequired: 117540 },
  { rank: 26, icon: "\u{1F5E1}\uFE0F", name: "Blade Initiate", flamesRequired: 135040 },
  { rank: 27, icon: "\u{1F6E0}\uFE0F", name: "Skill Crafter", flamesRequired: 154240 },
  { rank: 28, icon: "\u{1F529}", name: "Core Tight", flamesRequired: 175240 },
  { rank: 29, icon: "\u{1F9EC}", name: "Pattern Reader", flamesRequired: 198140 },
  { rank: 30, icon: "\u2694\uFE0F", name: "Combat Form", flamesRequired: 223040 },
  { rank: 31, icon: "\u{1F43A}", name: "Lone Hunter", flamesRequired: 250040 },
  { rank: 32, icon: "\u{1F985}", name: "Sky Watcher", flamesRequired: 279240 },
  { rank: 33, icon: "\u{1F9E8}", name: "Burst Force", flamesRequired: 310740 },
  { rank: 34, icon: "\u{1F3AE}", name: "Game Sense", flamesRequired: 344640 },
  { rank: 35, icon: "\u{1F9FF}", name: "Focus Eye", flamesRequired: 381040 },
  { rank: 36, icon: "\u{1F3CB}\uFE0F", name: "Strength Rise", flamesRequired: 420040 },
  { rank: 37, icon: "\u{1F4E1}", name: "Signal Pulse", flamesRequired: 461740 },
  { rank: 38, icon: "\u{1F6F0}\uFE0F", name: "Tracker", flamesRequired: 506240 },
  { rank: 39, icon: "\u2604\uFE0F", name: "Flame Surge", flamesRequired: 553640 },
  { rank: 40, icon: "\u{1F53A}", name: "Ascending Force", flamesRequired: 604040 },
  { rank: 41, icon: "\u{1F409}", name: "Flame Spirit", flamesRequired: 657540 },
  { rank: 42, icon: "\u{1F9BE}", name: "Power Grip", flamesRequired: 714240 },
  { rank: 43, icon: "\u{1F3AD}", name: "Dual Mind", flamesRequired: 774240 },
  { rank: 44, icon: "\u{1FA96}", name: "War Ready", flamesRequired: 837640 },
  { rank: 45, icon: "\u{1F3F0}", name: "Fortress Core", flamesRequired: 904540 },
  { rank: 46, icon: "\u{1F9F2}", name: "Magnetic Force", flamesRequired: 975040 },
  { rank: 47, icon: "\u{1F9EA}", name: "Meta Thinker", flamesRequired: 1049240 },
  { rank: 48, icon: "\u{1F576}\uFE0F", name: "Silent Killer", flamesRequired: 1127340 },
  { rank: 49, icon: "\u{1F510}", name: "Lock Breaker", flamesRequired: 1209440 },
  { rank: 50, icon: "\u{1F451}", name: "Half King", flamesRequired: 1295640 },
  { rank: 51, icon: "\u{1F30B}", name: "Volcanic Core", flamesRequired: 1386040 },
  { rank: 52, icon: "\u{1F9BF}", name: "Iron Step", flamesRequired: 1480740 },
  { rank: 53, icon: "\u{1FA99}", name: "Value Hunter", flamesRequired: 1579840 },
  { rank: 54, icon: "\u{1F9CA}", name: "Cold Logic", flamesRequired: 1683440 },
  { rank: 55, icon: "\u{1F3B2}", name: "Risk Player", flamesRequired: 1791640 },
  { rank: 56, icon: "\u{1F9EF}", name: "Flame Balance", flamesRequired: 1904540 },
  { rank: 57, icon: "\u{1F4D8}", name: "Deep Mind", flamesRequired: 2022240 },
  { rank: 58, icon: "\u{1FA93}", name: "Executioner", flamesRequired: 2144840 },
  { rank: 59, icon: "\u{1F6DE}", name: "Unstoppable", flamesRequired: 2272440 },
  { rank: 60, icon: "\u{1F3C6}", name: "Elite Fighter", flamesRequired: 2405140 },
  { rank: 61, icon: "\u{1F98D}", name: "Raw Power", flamesRequired: 2543040 },
  { rank: 62, icon: "\u{1F406}", name: "Speed Master", flamesRequired: 2686240 },
  { rank: 63, icon: "\u{1FAAC}", name: "Inner Sight", flamesRequired: 2834840 },
  { rank: 64, icon: "\u{1F396}\uFE0F", name: "Perfect Aim", flamesRequired: 2988940 },
  { rank: 65, icon: "\u{1F31E}", name: "Inferno Core", flamesRequired: 3148640 },
  { rank: 66, icon: "\u{1F5FF}", name: "Meta Breaker", flamesRequired: 3314040 },
  { rank: 67, icon: "\u{1F6F8}", name: "Advanced Pulse", flamesRequired: 3485240 },
  { rank: 68, icon: "\u{1FAAB}", name: "Control Field", flamesRequired: 3662340 },
  { rank: 69, icon: "\u{1F4EF}", name: "Wall Breaker", flamesRequired: 3845440 },
  { rank: 70, icon: "\u{1F329}\uFE0F", name: "Storm Rider", flamesRequired: 4034640 },
  { rank: 71, icon: "\u{1F432}", name: "Dragon Pulse", flamesRequired: 4230040 },
  { rank: 72, icon: "\u{1F9E0}", name: "Evolution Mind", flamesRequired: 4431740 },
  { rank: 73, icon: "\u{1F4CD}", name: "Target Master", flamesRequired: 4639840 },
  { rank: 74, icon: "\u{1F50B}", name: "Energy Core", flamesRequired: 4854440 },
  { rank: 75, icon: "\u{1F5FA}\uFE0F", name: "Global Vision", flamesRequired: 5075640 },
  { rank: 76, icon: "\u{1F9ED}", name: "Ultra Focus", flamesRequired: 5303540 },
  { rank: 77, icon: "\u2699\uFE0F", name: "System Break", flamesRequired: 5538240 },
  { rank: 78, icon: "\u{1F6E1}\uFE0F", name: "Absolute Guard", flamesRequired: 5779840 },
  { rank: 79, icon: "\u{1F525}", name: "Final Heat", flamesRequired: 6028440 },
  { rank: 80, icon: "\u{1F320}", name: "Sky Champion", flamesRequired: 6284140 },
  { rank: 81, icon: "\u{1F30C}", name: "Cosmic Step", flamesRequired: 6547040 },
  { rank: 82, icon: "\u{1FA90}", name: "Orbit Mind", flamesRequired: 6817240 },
  { rank: 83, icon: "\u2728", name: "Pure Energy", flamesRequired: 7094840 },
  { rank: 84, icon: "\u{1F52E}", name: "Omni Vision", flamesRequired: 7379940 },
  { rank: 85, icon: "\u{1F300}", name: "Reality Shift", flamesRequired: 7672640 },
  { rank: 86, icon: "\u{1F319}", name: "Void Walker", flamesRequired: 7973040 },
  { rank: 87, icon: "\u2600\uFE0F", name: "God Mind", flamesRequired: 8281240 },
  { rank: 88, icon: "\u26A1", name: "Eternal Surge", flamesRequired: 8597340 },
  { rank: 89, icon: "\u{1F6F8}", name: "Beyond Player", flamesRequired: 8921440 },
  { rank: 90, icon: "\u{1F531}", name: "Tri Power", flamesRequired: 9253640 },
  { rank: 91, icon: "\u{1F9EC}", name: "Final Evolution", flamesRequired: 9594040 },
  { rank: 92, icon: "\u{1F30B}", name: "Core Overload", flamesRequired: 9942740 },
  { rank: 93, icon: "\u2B50", name: "Star Breaker", flamesRequired: 10299840 },
  { rank: 94, icon: "\u269B\uFE0F", name: "Quantum Shift", flamesRequired: 10665440 },
  { rank: 95, icon: "\u{1F441}\uFE0F", name: "Infinite Sight", flamesRequired: 11039640 },
  { rank: 96, icon: "\u{1FAAC}", name: "Eternal Seal", flamesRequired: 11422540 },
  { rank: 97, icon: "\u26A1", name: "Absolute Energy", flamesRequired: 11814240 },
  { rank: 98, icon: "\u{1F525}", name: "Ultimate Flame", flamesRequired: 12214840 },
  { rank: 99, icon: "\u{1F451}", name: "Final Watcher", flamesRequired: 12624440 },
  { rank: 100, icon: "\u{1F3C1}", name: "Flame Emperor", flamesRequired: 13043140 }
];
function getRankBundle(totalFlames = 0) {
  const safeFlames = Math.max(0, Number(totalFlames) || 0);
  let current = RANK_LEVELS[0];
  for (const level of RANK_LEVELS) {
    if (safeFlames >= level.flamesRequired) {
      current = level;
    } else {
      break;
    }
  }
  const previous = RANK_LEVELS.find((l) => l.rank === current.rank - 1) || null;
  const next = RANK_LEVELS.find((l) => l.rank === current.rank + 1) || null;
  const currentBase = current.flamesRequired;
  const nextBase = next ? next.flamesRequired : current.flamesRequired;
  const span = next ? nextBase - currentBase : 0;
  const flamesIntoCurrent = Math.max(0, safeFlames - currentBase);
  const flamesNeededForNext = next ? Math.max(0, nextBase - safeFlames) : 0;
  const progressPercent = next && span > 0 ? Math.max(0, Math.min(100, flamesIntoCurrent / span * 100)) : 100;
  return {
    totalFlames: safeFlames,
    current,
    previous,
    next,
    progressPercent: Number(progressPercent.toFixed(2)),
    flamesIntoCurrent,
    flamesNeededForNext,
    isMaxRank: !next
  };
}
__name(getRankBundle, "getRankBundle");

// worker.js
var FRONTEND_ORIGIN = "http://localhost:3000";
var allowedColors = ["yellow", "red", "diamond", "black", "dragon-green", "dragon-blue", "dragon-red", "dragon-black"];
var BASE_BIRDS = ["yellow", "red", "diamond", "black"];
var ADMIN_USER_IDS = /* @__PURE__ */ new Set([
  "d8977183-c4b0-489e-b6a7-1d3d5007f878"
  // agrega más ids aquí
]);
function isAdminUser(env, userId) {
  return ADMIN_USER_IDS.has(String(userId));
}
__name(isAdminUser, "isAdminUser");
var CURRENT_SEASON_ID = "S5";
var BIRD_SHIELDS = {
  yellow: 1,
  red: 1,
  diamond: 1,
  black: 1,
  "dragon-green": 2,
  "dragon-blue": 2,
  "dragon-red": 2,
  "dragon-black": 2
};
var FREE_EGG_COOLDOWN = 8 * 60 * 60 * 1e3;
var LEVEL_TARGET = 100;
var MAX_LEVEL_CAP = 50;
var MIN_BASE_SEC = 5;
var MIN_SEC_PER_PIPE = 0.35;
var MAX_SCORE_PER_SEC = 3;
var EXTRA_ATTACK_COST = 600;
var MIN_FLAMES_TO_BE_ATTACKABLE = 50;
var MAX_STEAL = 75;
var DEV_PIPE_GAP = 1.04;
var LEVEL_DEFINITION = {
  0: { mode: "normal", label: "\u221E", isInfinity: true, pipes_target: 100 },
  1: { mode: "normal", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 25 },
  2: { mode: "normal", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 25 },
  3: { mode: "normal", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 25 },
  //x2
  4: { mode: "normal", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 25 },
  //x2
  5: { mode: "normal", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 25 },
  //x3
  6: { mode: "normal", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 25 },
  //x3
  7: { mode: "normal", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 25 },
  8: { mode: "normal", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 25 },
  9: { mode: "normal", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 25 },
  //x2
  10: { mode: "normal", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 25 },
  //x2
  11: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 30 },
  12: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 30 },
  13: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 30 },
  //x2
  14: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 30 },
  //x2
  15: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 30 },
  //x3
  16: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 30 },
  //x3
  17: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 30 },
  18: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 30 },
  19: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 30 },
  //x2
  20: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 30 },
  //x2
  21: { mode: "fade", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  22: { mode: "fade", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  23: { mode: "fade", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  //x2
  24: { mode: "fade", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  //x2
  25: { mode: "fade", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  //x3
  26: { mode: "fade", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  //x3
  27: { mode: "fade", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  28: { mode: "fade", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  29: { mode: "fade", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 50 },
  //x2
  30: { mode: "fade", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 50 },
  //x2
  31: { mode: "fade_moving", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  32: { mode: "fade_moving", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  33: { mode: "fade_moving", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  //x2
  34: { mode: "fade_moving", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  //x2
  35: { mode: "fade_moving", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  //x3
  36: { mode: "fade_moving", vx: 1.1, estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  //x3
  37: { mode: "fade_moving", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  38: { mode: "fade_moving", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 50 },
  39: { mode: "fade_moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 50 },
  //x2
  40: { mode: "fade_moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 50 },
  //x2
  41: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 80 },
  42: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, pipes_target: 80 },
  43: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 80 },
  //x2
  44: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 80 },
  //x2
  45: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 80 },
  //x3
  46: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 100 },
  //x3
  47: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 100 },
  48: { mode: "moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 100 },
  49: { mode: "fade_moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 100 },
  //x2
  50: { mode: "fade_moving", estrecho: 0.84 * DEV_PIPE_GAP, vx: 1.1, pipes_target: 100 },
  //x2
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
    label: "\u{1F37C}",
    vx: 0.6,
    // juego más lento
    baby: true
    // flag especial
  }
};
var DUEL_PLATFORM_FEE_RATE = 0.15;
var DUEL_CREATE_COOLDOWN_MS = 60 * 1e3;
var DUEL_EXPIRE_HOURS = 72;
var BOOST_SHOP = {
  // 🟢 1 HOUR
  BOOST_X3_HOUR: {
    id: "BOOST_X3_HOUR",
    multiplier: 3,
    duration_ms: 60 * 60 * 1e3,
    cost_eggs: 1e3
  },
  BOOST_X5_HOUR: {
    id: "BOOST_X5_HOUR",
    multiplier: 5,
    duration_ms: 60 * 60 * 1e3,
    cost_eggs: 2e3
  },
  // 🔵 1 DAY
  BOOST_X3_DAY: {
    id: "BOOST_X3_DAY",
    multiplier: 3,
    duration_ms: 24 * 60 * 60 * 1e3,
    cost_eggs: 2500
  },
  BOOST_X5_DAY: {
    id: "BOOST_X5_DAY",
    multiplier: 5,
    duration_ms: 24 * 60 * 60 * 1e3,
    cost_eggs: 4e3
  },
  // 🔴 1 WEEK (premium)
  BOOST_X8_WEEK: {
    id: "BOOST_X8_WEEK",
    multiplier: 8,
    duration_ms: 7 * 24 * 60 * 60 * 1e3,
    cost_eggs: 15e3
  }
};
function buildArenaRewardForRank(rankNumber) {
  const rank = Number(rankNumber || 1);
  let coins = 200;
  let spins = 0;
  if (rank >= 20) coins = 300;
  if (rank >= 40) coins = 400;
  if (rank >= 60) coins = 500;
  if (rank >= 80) coins = 600;
  if (rank % 5 === 0) spins += 1;
  if (rank % 10 === 0) coins += 200;
  return { coins, spins };
}
__name(buildArenaRewardForRank, "buildArenaRewardForRank");
function getRankLevelByNumber(rankNumber) {
  const rank = Number(rankNumber || 1);
  return RANK_LEVELS.find((r) => r.rank === rank) || RANK_LEVELS[0];
}
__name(getRankLevelByNumber, "getRankLevelByNumber");
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
__name(getActiveBoostRow, "getActiveBoostRow");
function makeDuelPublicId() {
  const rnd = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `DUEL-${rnd}`;
}
__name(makeDuelPublicId, "makeDuelPublicId");
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
    1e3: 10
  };
  return devMap[entry] ?? 1;
}
__name(mapDevDuelEntry, "mapDevDuelEntry");
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
__name(buildDuelEconomy, "buildDuelEconomy");
function isValidNominalDuelEntryTier(entryTier) {
  return [1, 5, 10, 20, 30, 50, 75, 100, 150, 200, 500, 1e3].includes(Number(entryTier));
}
__name(isValidNominalDuelEntryTier, "isValidNominalDuelEntryTier");
function isValidArenaSetup(arenaSetup) {
  if (!arenaSetup || typeof arenaSetup !== "object") return false;
  const chicks = Array.isArray(arenaSetup.chicks) ? arenaSetup.chicks : [];
  const rockets = Array.isArray(arenaSetup.rockets) ? arenaSetup.rockets : [];
  if (chicks.length !== 3) return false;
  if (rockets.length <= 0) return false;
  return true;
}
__name(isValidArenaSetup, "isValidArenaSetup");
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
__name(insertDuelEventAndFeed, "insertDuelEventAndFeed");
async function insertActivityFeed(env, {
  activityType,
  actorUserId = null,
  targetUserId = null,
  referenceTable = null,
  referenceId = null,
  payload = null,
  priority = 0,
  visible = 1,
  createdAt = null
}) {
  const ts = createdAt || Math.floor(Date.now() / 1e3);
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
__name(insertActivityFeed, "insertActivityFeed");
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
__name(releaseExpiredDuelReservations, "releaseExpiredDuelReservations");
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
__name(userHasActiveDuelReservation, "userHasActiveDuelReservation");
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
__name(assertDuelCreateCooldown, "assertDuelCreateCooldown");
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
__name(insertDuelEvent, "insertDuelEvent");
function cacheKey(path) {
  return new Request(`https://cache.flappypi/${path}`);
}
__name(cacheKey, "cacheKey");
function makeTid(prefix = "rv") {
  const rnd = new Uint8Array(16);
  crypto.getRandomValues(rnd);
  const hex = [...rnd].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${Date.now()}_${hex}`;
}
__name(makeTid, "makeTid");
async function readJsonSafe(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
__name(readJsonSafe, "readJsonSafe");
var SPIN_TABLE_V1 = {
  version: "v1",
  // Nota: weights en "porcentaje" entero para dejarlo legible
  items: [
    { type: "eggs", amount: 100, weight: 40 },
    { type: "eggs", amount: 200, weight: 30 },
    { type: "eggs", amount: 300, weight: 18 },
    { type: "eggs", amount: 400, weight: 2 },
    { type: "eggs", amount: 500, weight: 1 },
    { type: "hearts", amount: 1, weight: 40 },
    { type: "hearts", amount: 2, weight: 30 },
    { type: "hearts", amount: 3, weight: 18 },
    { type: "hearts", amount: 4, weight: 2 },
    { type: "hearts", amount: 5, weight: 1 }
  ]
};
function cryptoRandInt(maxExclusive) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % maxExclusive;
}
__name(cryptoRandInt, "cryptoRandInt");
function rollSpin(table = SPIN_TABLE_V1) {
  const items = table.items;
  const total = items.reduce((acc2, it) => acc2 + (it.weight || 0), 0);
  if (total <= 0) throw new Error("SPIN_TABLE_INVALID_TOTAL");
  const r = cryptoRandInt(total);
  let acc = 0;
  for (const it of items) {
    acc += it.weight;
    if (r < acc) {
      return {
        version: table.version,
        roll: r,
        total,
        reward: { type: it.type, amount: it.amount },
        // opcional: snapshot de probabilidades para transparencia
        probabilities: items.map((x) => ({
          type: x.type,
          amount: x.amount,
          weight: x.weight,
          pct: x.weight / total * 100
        }))
      };
    }
  }
  throw new Error("SPIN_ROLL_FAILED");
}
__name(rollSpin, "rollSpin");
function getLevelTargetPipes(level_id) {
  if (level_id === 0) return null;
  if (level_id === 99999) return null;
  const cfg = getLevelConfig(level_id);
  const target = Number(cfg?.pipes_target);
  if (Number.isInteger(target) && target > 0) return target;
  return LEVEL_TARGET;
}
__name(getLevelTargetPipes, "getLevelTargetPipes");
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
var ORIGINS = /* @__PURE__ */ new Set([
  "http://localhost:3000",
  "https://qa.classic.flappypi.com",
  "https://classic.flappypi.com"
]);
function isAllowedOrigin(origin) {
  return origin && ORIGINS.has(origin);
}
__name(isAllowedOrigin, "isAllowedOrigin");
function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return {};
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function generateUsername() {
  const prefix = "flappypi";
  const digits = randomDigits(10);
  return `${prefix}_${digits}`;
}
__name(generateUsername, "generateUsername");
function ymdHmsUTC(ms = Date.now()) {
  const d = new Date(ms);
  const pad = /* @__PURE__ */ __name((n) => String(n).padStart(2, "0"), "pad");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
__name(ymdHmsUTC, "ymdHmsUTC");
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
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || null;
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
      id,
      ts_ms,
      ts_ymd,
      user_id,
      ip,
      ua,
      path,
      action,
      outcome,
      reason,
      game_uid,
      nonce,
      score,
      delta_score,
      reward_json ? typeof reward_json === "string" ? reward_json : JSON.stringify(reward_json) : null,
      meta ? JSON.stringify(meta).slice(0, 4e3) : null
    ).run();
  } catch (e) {
    console.warn("audit failed:", e?.message || e);
  }
}
__name(audit, "audit");
function calcDurationSec(payloadStartedAt) {
  return (Date.now() - Number(payloadStartedAt)) / 1e3;
}
__name(calcDurationSec, "calcDurationSec");
function validateCompleteGameAttempt({ payload, body }) {
  const { score, jumps, positions, complete_game } = body;
  const realPipesPassed = Number(
    body.pipes_passed ?? body.difficulty_pipes_passed ?? 0
  );
  if (complete_game !== true) {
    return { ok: true, forcedComplete: false, reason: null, meta: { complete_requested: false } };
  }
  const mode = payload.mode;
  const level_id = Number(payload.level_id);
  if (mode !== "levels") {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_NOT_LEVELS_MODE", meta: { mode, level_id } };
  }
  if (!Number.isInteger(level_id) || level_id <= 0 || level_id === 99999) {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_INVALID_LEVEL_ID", meta: { level_id } };
  }
  const target = getLevelTargetPipes(level_id);
  if (!Number.isInteger(target) || target <= 0) {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_TARGET_NOT_DEFINED", meta: { level_id, target } };
  }
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
  const durationSec = calcDurationSec(payload.startedAt);
  const minDurationSec = Math.max(MIN_BASE_SEC, target * MIN_SEC_PER_PIPE);
  if (durationSec < minDurationSec) {
    return {
      ok: false,
      forcedComplete: false,
      reason: "COMPLETE_TOO_FAST",
      meta: { durationSec, min: minDurationSec, target, level_id }
    };
  }
  const MAX_COMPLETE_PIPES_PER_SEC = 2;
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
  return {
    ok: true,
    forcedComplete: true,
    reason: null,
    meta: { mode, level_id, target, durationSec }
  };
}
__name(validateCompleteGameAttempt, "validateCompleteGameAttempt");
function getLevelConfig(level_id) {
  return LEVEL_DEFINITION[level_id] || LEVEL_DEFINITION[String(level_id)] || null;
}
__name(getLevelConfig, "getLevelConfig");
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
async function requireUser(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const token = cookie.match(/session=([^;]+)/)?.[1];
  if (!token) {
    return null;
  }
  let payload;
  try {
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1e3)) {
    return null;
  }
  const user = await env.DB.prepare(
    "SELECT id, email, user_name, total_score, welcome_claimed FROM users WHERE id = ?"
  ).bind(payload.sub).first();
  return user || null;
}
__name(requireUser, "requireUser");
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
  const sigBytes = Uint8Array.from(atob(encSig.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encSig.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(data)
  );
  if (!ok) throw new Error("JWT_BAD_SIGNATURE");
  const payload = JSON.parse(base64urlDecode(encPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) throw new Error("JWT_EXPIRED");
  const header = JSON.parse(base64urlDecode(encHeader));
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("JWT_HEADER_INVALID");
  }
  return payload;
}
__name(verifyJWT, "verifyJWT");
var worker_default = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request)
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
              headers: corsHeaders(request)
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
                  ...corsHeaders(request),
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
                ...corsHeaders(request),
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
        const isProd = env.ENV !== "dev";
        const cookieFlags = isProd ? "HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000" : "HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000";
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders(request),
            //"Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/`,
            //"Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000`,
            "Set-Cookie": `session=${jwt}; ${cookieFlags}`,
            "Location": FRONTEND_ORIGIN
          }
        });
      }
      if (url.pathname === "/me") {
        const cookie = request.headers.get("Cookie") || "";
        const token = cookie.match(/session=([^;]+)/)?.[1];
        const lvlLoaded = url.searchParams.get("lvl_loaded") === "1";
        if (!token) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders(request)
          });
        }
        let payload;
        try {
          payload = await verifyJWT(token, env.JWT_SECRET);
        } catch {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        if (payload.exp < Math.floor(Date.now() / 1e3)) {
          return new Response("Token expired", {
            status: 401,
            headers: corsHeaders(request)
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
      `).bind(payload.sub).first();
        if (!user) {
          return new Response("User not found", {
            status: 401,
            headers: corsHeaders(request)
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
        const birdColor = user.bird_color || "yellow";
        let maxShields = BIRD_SHIELDS[birdColor] || 1;
        let bird_maxShields = BIRD_SHIELDS[birdColor] || 1;
        let userShields = user.hearts || 0;
        if (userShields < maxShields)
          maxShields = userShields;
        const ownedDragonsRows = await env.DB.prepare(`
        SELECT skin_id
        FROM user_dragon_skins
        WHERE user_id = ?
      `).bind(user.id).all();
        const owned_dragons = (ownedDragonsRows.results || []).map((r) => r.skin_id);
        let data_return_LEVEL_DEFINITION = null;
        if (!lvlLoaded)
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
          max_level_unlocked: 0,
          //user.max_level_unlocked,
          last_selected_level: 0,
          //user.last_selected_level,
          auth_provider: user.auth_provider,
          welcome_claimed: user.welcome_claimed,
          bird_color: user.bird_color,
          hearts: user.hearts,
          bird_shields: maxShields,
          //Máximos escudos para utilizar por usuario
          bird_shields_max: bird_maxShields,
          //
          free_spins: user.free_spins,
          owned_dragons,
          LEVEL_DEFINITION: data_return_LEVEL_DEFINITION,
          rank_info: rankBundle,
          theme_mode: user.theme_mode || "day",
          active_boost: activeBoost
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
        try {
          body = await request.json();
        } catch {
        }
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
        const me_total_rank_info = me_total ? getRankBundle(Number(me_total.real_total_score || 0)) : null;
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
        const me_world_rank_info = me_world ? getRankBundle(Number(me_world.total_score || 0)) : null;
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
      if (url.pathname === "/game/state" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400, headers: corsHeaders(request) });
        }
        const requestedMax = Number(body.max_level_unlocked);
        const requestedLast = Number(body.last_selected_level);
        if (!Number.isInteger(requestedMax) || !Number.isInteger(requestedLast)) {
          return new Response("Invalid fields", { status: 400, headers: corsHeaders(request) });
        }
        if (requestedMax < 0 || requestedMax > MAX_LEVEL_CAP) {
          return new Response("Out of range", { status: 400, headers: corsHeaders(request) });
        }
        const row = await env.DB.prepare(`SELECT max_level_unlocked, last_selected_level FROM users WHERE id = ?`).bind(user.id).first();
        if (!row) {
          return new Response("User not found", { status: 404, headers: corsHeaders(request) });
        }
        const currentMax = Number(row.max_level_unlocked ?? 0);
        const currentLast = Number(row.last_selected_level ?? 0);
        const MAX_STEP = 1;
        if (requestedMax < currentMax) {
          return new Response("Cannot decrease max level", { status: 400, headers: corsHeaders(request) });
        }
        if (requestedMax > currentMax + MAX_STEP) {
          return new Response("Level jump too large", { status: 409, headers: corsHeaders(request) });
        }
        const safeLast = Math.min(Math.max(requestedLast, 0), requestedMax);
        await env.DB.prepare(`
        UPDATE users
        SET
          max_level_unlocked = ?,
          last_selected_level = ?
        WHERE id = ?
      `).bind(requestedMax, safeLast, user.id).run();
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/profile/update" && request.method === "POST") {
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
        const { name, wallet, twitter, bird_color, theme_mode } = body;
        if (!name || !name.trim()) {
          return new Response("Name required", {
            status: 400,
            headers: corsHeaders(request)
          });
        }
        if (wallet && wallet.length > 120) {
          return new Response("Invalid wallet", {
            status: 400,
            headers: corsHeaders(request)
          });
        }
        let real_color = bird_color;
        if (!allowedColors.includes(real_color)) {
          real_color = "yellow";
        }
        if (!BASE_BIRDS.includes(real_color)) {
          const rows = await env.DB.prepare(`
          SELECT skin_id
          FROM user_dragon_skins
          WHERE user_id = ?
        `).bind(user.id).all();
          const ownedDragons = rows.results.map((r) => r.skin_id);
          if (!ownedDragons.includes(real_color)) {
            real_color = "yellow";
          }
        }
        let twitterClean = null;
        if (twitter) {
          twitterClean = twitter.replace(/^@/, "").trim();
          if (!/^[a-zA-Z0-9_]{1,15}$/.test(twitterClean)) {
            return new Response("Invalid Twitter username", {
              status: 400,
              headers: corsHeaders(request)
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
      `).bind(
          name.trim(),
          wallet?.trim() || null,
          twitterClean,
          real_color,
          safeThemeMode,
          user.id
        ).run();
        return new Response(
          JSON.stringify({ ok: true, bird_color: real_color, theme_mode: safeThemeMode }),
          {
            status: 200,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json"
            }
          }
        );
      }
      const MAX_REVIVES = 3;
      if (url.pathname === "/game/revive" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400, headers: corsHeaders(request) });
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
          }
        }
        const { gameToken, method, ad_tid } = body;
        if (!gameToken) {
          return new Response("Missing game token", { status: 400, headers: corsHeaders(request) });
        }
        const reviveMethod = method === "ad" ? "ad" : "eggs";
        let payload;
        try {
          payload = await verifyJWT(gameToken, env.JWT_SECRET);
        } catch {
          return new Response("Invalid game token", { status: 401, headers: corsHeaders(request) });
        }
        if (payload.sub !== user.id || payload.type !== "game") {
          return new Response("Invalid game token", { status: 401, headers: corsHeaders(request) });
        }
        const { game_uid } = payload;
        if (!game_uid) {
          return new Response("Invalid game context", { status: 400, headers: corsHeaders(request) });
        }
        const reviveAgg = await env.DB.prepare(`
        SELECT COUNT(*) AS cnt
        FROM game_revives
        WHERE game_uid = ? AND user_id = ?
      `).bind(game_uid, user.id).first();
        const used = Number(reviveAgg?.cnt || 0);
        if (used >= MAX_REVIVES) {
          return new Response(
            JSON.stringify({ ok: false, message: "Revive limit reached", revives_used: used, max_revives: MAX_REVIVES }),
            { status: 400, headers: { ...corsHeaders(request), "Content-Type": "application/json" } }
          );
        }
        const reviveNo = used + 1;
        let eggsCost = 500;
        let dbUser2 = null;
        if (reviveMethod === "ad") {
          const tid = String(ad_tid || "").trim();
          if (!tid) {
            return new Response(JSON.stringify({ ok: false, message: "Missing ad_tid" }), {
              status: 400,
              headers: { ...corsHeaders(request), "Content-Type": "application/json" }
            });
          }
          const row = await env.DB.prepare(`
          SELECT status FROM ad_rewards
          WHERE provider='applixir' AND reward_type='revive' AND tid=? AND user_id=?
          LIMIT 1
        `).bind(tid, user.id).first();
          if (!row || row.status !== "rewarded") {
            await audit(env, request, {
              user_id: user.id,
              action: "GAME_REVIVE_REJECT",
              outcome: "REJECT",
              reason: "AD_NOT_REWARDED",
              meta: { tid, status: row?.status || null }
            });
            return new Response(JSON.stringify({ ok: false, message: "Ad not verified" }), {
              status: 409,
              headers: { ...corsHeaders(request), "Content-Type": "application/json" }
            });
          }
          await env.DB.prepare(`
          UPDATE ad_rewards
          SET status='consumed', consumed_at=?
          WHERE tid=? AND user_id=? AND status='rewarded'
        `).bind(Date.now(), tid, user.id).run();
          eggsCost = 0;
        } else {
          eggsCost = 500;
          const upd = await env.DB.prepare(`
          UPDATE users
          SET eggs = eggs - ?
          WHERE id = ? AND eggs >= ?
        `).bind(eggsCost, user.id, eggsCost).run();
          if (!upd?.meta || upd.meta.changes !== 1) {
            return new Response("Not enough coins", { status: 400, headers: corsHeaders(request) });
          }
          await env.DB.prepare(`
          INSERT INTO game_revives (
            id, game_uid, user_id, revive_no, eggs_used, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            game_uid,
            user.id,
            reviveNo,
            eggsCost,
            Date.now()
          ).run();
        }
        dbUser2 = await env.DB.prepare(
          "SELECT eggs FROM users WHERE id = ?"
        ).bind(user.id).first();
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_REVIVE_OK",
          outcome: "OK",
          game_uid,
          nonce: payload.nonce,
          meta: {
            reviveNo,
            eggsCost
          }
        });
        return new Response(
          JSON.stringify({
            ok: true,
            revive_no: reviveNo,
            revives_used: reviveNo,
            // para UI
            max_revives: MAX_REVIVES,
            eggs_left: Number(dbUser2?.eggs ?? 0)
          }),
          {
            status: 200,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          }
        );
      }
      if (url.pathname === "/auth/guest-login" && request.method === "POST") {
        try {
          let body = {};
          try {
            body = await request.json();
          } catch {
          }
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
              }
            } else {
              await audit(env, request, {
                user_id: null,
                action: "TURNSTILE_MISSING_GUEST",
                outcome: "ALLOW",
                reason: "missing_turnstile_token",
                meta: null
              });
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
          const HUNDRED_YEARS = 60 * 60 * 24 * 365 * 100;
          const jwt = await signJWT({
            sub: guestId,
            iat: now,
            exp: now + HUNDRED_YEARS
          }, env.JWT_SECRET);
          const isProd = env.ENV !== "dev";
          const sessionCookieFlags = isProd ? `HttpOnly; SameSite=None; Secure; Path=/; Max-Age=${HUNDRED_YEARS}` : `HttpOnly; SameSite=Lax; Path=/; Max-Age=${HUNDRED_YEARS}`;
          const guestCookieFlags = isProd ? `SameSite=None; Secure; Path=/; Max-Age=${HUNDRED_YEARS}` : `SameSite=Lax; Path=/; Max-Age=${HUNDRED_YEARS}`;
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
            cause: err?.cause
          };
          return new Response("Internal Server Error" + JSON.stringify(errorInfo, null, 2), {
            status: 500,
            headers: corsHeaders(request)
          });
        }
      }
      if (url.pathname === "/logout") {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders(request),
            // borrar cookie
            "Set-Cookie": "session=; HttpOnly; SameSite=None; Path=/; Max-Age=0",
            // volver al frontend
            "Location": FRONTEND_ORIGIN
          }
        });
      }
      if (url.pathname === "/auth/pi-login" && request.method === "POST") {
        try {
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
          const piUser = await verifyPiAccessToken(accessToken, env);
          if (!piUser || !piUser.username) {
            return new Response("Invalid Pi token", {
              status: 401,
              headers: corsHeaders(request)
            });
          }
          const userId = piUser.uid;
          const generatedUsername_pi = await generateUniqueUsername(env, piUser.username);
          let user = await env.DB.prepare(
            "SELECT id FROM users WHERE id = ?"
          ).bind(userId).first();
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
          const jwt = await signJWT({
            sub: userId,
            iat: Math.floor(Date.now() / 1e3),
            exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 30
          }, env.JWT_SECRET);
          const isProd = env.ENV !== "dev";
          const cookieFlags = isProd ? "HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000" : "HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000";
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
          if (err instanceof Response) {
            return new Response(err.body, {
              status: err.status,
              headers: corsHeaders(request)
            });
          }
          const errorInfo = {
            name: err?.name,
            message: err?.message,
            stack: err?.stack,
            cause: err?.cause
          };
          return new Response("Internal Server Error" + JSON.stringify(errorInfo, null, 2), {
            status: 500,
            headers: corsHeaders(request)
          });
        }
      }
      if (url.pathname === "/game/finish" && request.method === "POST") {
        const __t0 = Date.now();
        const debugTimes = {};
        const mark = /* @__PURE__ */ __name((label) => {
          debugTimes[label] = Number(((Date.now() - __t0) / 1e3).toFixed(4));
        }, "mark");
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
        if (!Number.isInteger(score) || score < 0) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "INVALID_SCORE",
            meta: { score }
          });
          mark("reject_invalid_score");
          return new Response(JSON.stringify({
            ok: false,
            code: "INVALID_SCORE",
            message: "Invalid score",
            debug_times: debugTimes
          }), {
            status: 400,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
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
        const durationSec = (Date.now() - startedAtServer) / 1e3;
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
        const boostMultiplierFromClient = Math.max(1, Number(body.boost_multiplier || 1));
        const scoreMultiplierFromClient = Math.max(1, Number(body.score_multiplier || 1));
        const maxEffectiveMultiplier = Math.min(Math.max(boostMultiplierFromClient, scoreMultiplierFromClient), 10);
        const maxScorePerSecEffective = MAX_SCORE_PER_SEC * maxEffectiveMultiplier;
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
              durationSec,
              maxSps: maxScorePerSecEffective,
              boostMultiplierFromClient,
              scoreMultiplierFromClient
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
          if (!active || await active.text() !== nonce) {
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
        let complete_game_safe = complete_game === true;
        if (complete_game_safe) {
          const completeCheck = validateCompleteGameAttempt({ payload, body });
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
            await env.DB.prepare(`UPDATE users SET free_spins = free_spins + 1 WHERE id = ?`).bind(user.id).run();
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
        const isNewBest = score > (user.max_score || 0);
        const shouldPublishGameActivity = deltaScore > 0 && (deltaScore >= 10 || score >= 50 || isNewBest === true);
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
      if (url.pathname === "/spin/claim" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        const now = Date.now();
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
        const rewardPayload = rollSpin(SPIN_TABLE_V1);
        const reward = rewardPayload.reward;
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
        await userUpdateStmt.run();
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
              headers: corsHeaders(request)
            });
          }
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
                  "Content-Type": "application/json"
                }
              }
            );
          }
          const WELCOME_EGGS = 4e3;
          const WELCOME_SHIELD = 3;
          const WELCOME_SPIN = 5;
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
          const updatedUser = await env.DB.prepare(`
          SELECT eggs, hearts FROM users WHERE id = ?
        `).bind(user.id).first();
          for (let i = 0; i < WELCOME_SPIN; i++) {
            await env.DB.prepare(`
            INSERT INTO spins (id, user_id, source, status, created_at, game_uid, reward_json)
            VALUES (?, ?, 'welcome', 'PENDING', ?, NULL, NULL)
          `).bind(crypto.randomUUID(), user.id, Date.now()).run();
          }
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
                "Content-Type": "application/json"
              }
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
                "Content-Type": "application/json"
              }
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
          return new Response(JSON.stringify({ ok: false, error: "Missing skin_id" }), {
            status: 400,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const skin = await env.DB.prepare(`
        SELECT id, cost_eggs
        FROM dragon_skins
        WHERE id = ? AND COALESCE(active,1)=1
        LIMIT 1
      `).bind(skinId).first();
        if (!skin) {
          return new Response(JSON.stringify({ ok: false, error: "Skin not found" }), {
            status: 404,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const cost = Number(skin.cost_eggs || 0);
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
            status: 200,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const upd = await env.DB.prepare(`
        UPDATE users
        SET eggs = eggs - ?
        WHERE id = ? AND eggs >= ?
      `).bind(cost, user.id, cost).run();
        if (!upd?.meta || upd.meta.changes !== 1) {
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
            status: 400,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const owned = await env.DB.prepare(`
        SELECT skin_id
        FROM user_dragon_skins
        WHERE user_id = ?
      `).bind(user.id).all();
        const ownedDragons = owned.results.map((r) => r.skin_id);
        const u2 = await env.DB.prepare(`SELECT eggs FROM users WHERE id=?`).bind(user.id).first();
        return new Response(JSON.stringify({
          ok: true,
          skin_id: skinId,
          cost,
          eggs: Number(u2?.eggs || 0),
          purchased_at: now,
          owned_dragons: ownedDragons
        }), {
          status: 200,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/game/start" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders(request)
          });
        }
        const startedAt = Date.now();
        const nonce = crypto.randomUUID();
        const gameUid = crypto.randomUUID();
        let body = {};
        try {
          body = await request.json();
        } catch {
        }
        const mode = body?.mode === "levels" ? "levels" : "infinity";
        let level_id = Number(body?.level_id);
        if (!Number.isInteger(level_id)) level_id = 0;
        if (level_id !== 0 && level_id !== 99999 && (level_id < 1 || level_id > MAX_LEVEL_CAP)) {
          level_id = 0;
        }
        const gameToken = await signJWT(
          {
            sub: user.id,
            nonce,
            game_uid: gameUid,
            // 🎯 lo que nos interesa ahora
            type: "game",
            startedAt,
            iat: Math.floor(Date.now() / 1e3),
            exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 3,
            // 3h
            level_id,
            mode
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
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_START",
          outcome: "OK",
          game_uid: gameUid,
          nonce,
          meta: {
            exp: "3h",
            mode,
            // "levels" | "infinity"
            level_id
            // 0 / 1..50 / 99999
          }
        });
        return new Response(
          JSON.stringify({ gameToken }),
          {
            status: 200,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json"
            }
          }
        );
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
        const body = request.method === "POST" ? await readJsonSafe(request) || {} : {};
        const payload = {
          method: request.method,
          query: Object.fromEntries(q.entries()),
          body,
          ip: request.headers.get("CF-Connecting-IP") || null,
          ua: request.headers.get("User-Agent") || null,
          ts: now
        };
        const tid = body?.tid || body?.transaction_id || body?.transactionId || q.get("tid") || q.get("transaction_id") || q.get("transactionId");
        if (!tid) {
          return new Response(JSON.stringify({ ok: false, error: "tid_missing" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        const res = await env.DB.prepare(`
        UPDATE ad_rewards
        SET status='rewarded', payload_json=?, rewarded_at=?
        WHERE provider='applixir' AND reward_type='revive' AND tid=? AND status='pending'
      `).bind(
          JSON.stringify(payload).slice(0, 4e3),
          now,
          tid
        ).run();
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
                "Content-Type": "application/json"
              }
            }
          );
        }
        const body = await request.json();
        const heartsToBuy = Number(body.hearts || 0);
        if (heartsToBuy <= 0) {
          return new Response(
            JSON.stringify({ error: true, message: "Invalid hearts amount" }),
            {
              status: 400,
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json"
              }
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
                "Content-Type": "application/json"
              }
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
                "Content-Type": "application/json"
              }
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
              "Content-Type": "application/json"
            }
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
        const expiresAt = new Date(Date.now() + DUEL_EXPIRE_HOURS * 60 * 60 * 1e3).toISOString();
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
          economy.nominal_entry_tier_pi,
          // entry_tier_pi viejo
          economy.nominal_entry_tier_pi,
          // nominal_entry_tier_pi nuevo
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
            note: env.ENV === "dev" ? "DEV payment mapping applied" : "Production payment amount"
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
      if (url.pathname.startsWith("/duels/") && url.pathname.endsWith("/prepare-challenger") && request.method === "POST") {
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
        if (!isAdminUser(env, user.id)) {
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
          const url2 = new URL(request.url);
          const limitRaw = Number(url2.searchParams.get("limit") || 20);
          const limit = Math.min(Math.max(limitRaw, 1), 50);
          const cursorRaw = url2.searchParams.get("cursor");
          const cursor = cursorRaw ? Number(cursorRaw) : null;
          const cutoff = Math.floor(Date.now() / 1e3) - 48 * 60 * 60;
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
          const mapped = items.map((row) => ({
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
        const pending_rewards = items.map((item) => {
          const rankLevel = getRankLevelByNumber(item.to_rank);
          return {
            ...item,
            to_rank_name: rankLevel?.name || null,
            to_rank_icon: rankLevel?.icon || "\u{1F525}"
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
      if (url.pathname === "/ads/pi/verify" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        const body = await readJsonSafe(request);
        const adId = String(body?.adId || "").trim();
        const rewardType = String(body?.rewardType || "revive").trim();
        if (!adId) {
          return new Response(JSON.stringify({ ok: false, error: "adId_required" }), {
            status: 400,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
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
        let piStatus;
        try {
          const piRes = await fetch(
            `https://api.minepi.com/ads_network/status/${encodeURIComponent(adId)}`,
            {
              method: "GET",
              headers: {
                "Authorization": `Key ${env.PI_SERVER_API_KEY}`
                // variable de entorno
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
        const tid = makeTid("piad");
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
      if (err instanceof Response) {
        return new Response(err.body, {
          status: err.status,
          headers: corsHeaders(request)
        });
      }
      const errorInfo = {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause
      };
      return new Response("Internal Server Error" + JSON.stringify(errorInfo, null, 2), {
        status: 500,
        headers: corsHeaders(request)
      });
    }
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
__name(verifyPiAccessToken, "verifyPiAccessToken");
async function verifyTurnstileToken({ token, request, env }) {
  if (!token) return { ok: false, code: "TS_MISSING" };
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || void 0;
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
__name(verifyTurnstileToken, "verifyTurnstileToken");
function getUtcDate() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
__name(getUtcDate, "getUtcDate");
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
__name(errorResponse, "errorResponse");
function calcStealPreview(targetFlames, targetRank) {
  const flames = Number(targetFlames || 0);
  const rank = Number(targetRank || 999999);
  if (flames < MIN_FLAMES_TO_BE_ATTACKABLE) return 0;
  let pct = 8e-3;
  if (rank <= 10) pct = 8e-3;
  else if (rank > 100) pct = 8e-3;
  const raw = Math.floor(flames * pct);
  return Math.max(1, Math.min(MAX_STEAL, raw));
}
__name(calcStealPreview, "calcStealPreview");
function getAttackSuccessRate(targetRank) {
  const rank = Number(targetRank || 999999);
  if (rank <= 10) return 0.5;
  if (rank <= 100) return 0.6;
  return 0.8;
}
__name(getAttackSuccessRate, "getAttackSuccessRate");
function rollAttackSuccess(targetRank) {
  const successRate = getAttackSuccessRate(targetRank);
  return Math.random() < successRate;
}
__name(rollAttackSuccess, "rollAttackSuccess");
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
__name(getDailyAttackRow, "getDailyAttackRow");
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
__name(getDailyReceiveRow, "getDailyReceiveRow");
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
__name(ensureDailyAttackRow, "ensureDailyAttackRow");
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
__name(ensureDailyReceiveRow, "ensureDailyReceiveRow");
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
    const attacksLeftToday = Number(myDailyRow?.base_attack_limit || 10) + Number(myDailyRow?.extra_attacks_purchased || 0) - Number(myDailyRow?.attacks_done || 0);
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
      const attacksReceivedToday = Number(row.attacks_received || 0);
      const receiveLimit = Number(row.receive_attack_limit || 10);
      const stealPreview = calcStealPreview(row.flames, rank);
      const canAttack = attacksLeftToday > 0 && attacksReceivedToday < receiveLimit && row.flames >= MIN_FLAMES_TO_BE_ATTACKABLE && stealPreview > 0 && user.total_score >= MIN_FLAMES_TO_BE_ATTACKABLE;
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
__name(handleAttackTargets, "handleAttackTargets");
async function handleAttackExecute(request, env, userId) {
  try {
    const db = env.DB;
    const attackDateUtc = getUtcDate();
    const body = await request.json();
    const targetUserId = body?.target_user_id;
    if (!targetUserId || targetUserId === userId) {
      return errorResponse(request, "INVALID_TARGET", 400, {
        message: "\u274C Invalid target selected."
      });
    }
    await ensureDailyAttackRow(db, userId, attackDateUtc);
    await ensureDailyAttackRow(db, targetUserId, attackDateUtc);
    await ensureDailyReceiveRow(db, targetUserId, attackDateUtc);
    const myDailyRow = await getDailyAttackRow(db, userId, attackDateUtc);
    const targetReceiveRow = await getDailyReceiveRow(db, targetUserId, attackDateUtc);
    const myLimit = Number(myDailyRow?.base_attack_limit || 10) + Number(myDailyRow?.extra_attacks_purchased || 0);
    const myDone = Number(myDailyRow?.attacks_done || 0);
    if (myDone >= myLimit) {
      return errorResponse(request, "DAILY_ATTACK_LIMIT_REACHED", 400, {
        message: "\u{1F6D1} You have used all your attacks for today."
      });
    }
    const targetReceived = Number(targetReceiveRow?.attacks_received || 0);
    const targetReceiveLimit = Number(targetReceiveRow?.receive_attack_limit || 10);
    if (targetReceived >= targetReceiveLimit) {
      return errorResponse(request, "TARGET_DAILY_RECEIVE_LIMIT_REACHED", 400, {
        message: "\u{1F6E1}\uFE0F This player cannot receive more attacks today."
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
        message: "\u{1F464} Target not found."
      });
    }
    const targetFlamesBefore = Number(target.total_score || 0);
    const attackerFlamesBefore = Number(attacker.total_score || 0);
    if (targetFlamesBefore < MIN_FLAMES_TO_BE_ATTACKABLE) {
      return errorResponse(request, "TARGET_TOO_LOW", 400, {
        message: "\u{1F331} This player does not have enough flames to be attacked."
      });
    }
    const stolenPreview = calcStealPreview(targetFlamesBefore, target.rank);
    if (stolenPreview <= 0) {
      return errorResponse(request, "NOTHING_TO_STEAL", 400, {
        message: "\u{1FAB9} There is nothing to steal from this target."
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
        targetUserId,
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
        message: `\u{1F4A8} Your attack failed! ${target.name} escaped this time.`
      }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }
    const stolenFinal = Math.min(stolenPreview, targetFlamesBefore);
    if (stolenFinal <= 0) {
      return errorResponse(request, "NOTHING_TO_STEAL", 400, {
        message: "\u{1FAB9} There is nothing to steal from this target."
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
      targetUserId,
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
      message: `\u{1F525} Successful attack! You stole ${stolenFinal} flames from ${target.name}.`
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
__name(handleAttackExecute, "handleAttackExecute");
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
        message: "\u{1F6D1} Extra attacks already purchased today."
      });
    }
    if (currentCoins < EXTRA_ATTACK_COST) {
      return errorResponse(request, "NOT_ENOUGH_COINS", 400, {
        message: "\u{1F4B0} Not enough coins."
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
    const totalLimit = Number(dailyRow?.base_attack_limit || 10) + Number(dailyRow?.extra_attacks_purchased || 0);
    const attacksDone = Number(dailyRow?.attacks_done || 0);
    await insertActivityFeed(env, {
      activityType: "buy_attacks",
      actorUserId: user.id,
      referenceTable: "user_attack_daily",
      // o la tabla que corresponda
      referenceId: null,
      payload: {
        extra_attacks: Number(quantity || 0),
        coins_spent: Number(coinCost || 0)
      },
      priority: 2
      // medio (debajo de hit/duel_won)
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
__name(handleBuyExtraAttacks, "handleBuyExtraAttacks");
async function assertDailyDuelTierLimit(env, userId, entryTier) {
  const entry = Number(entryTier);
  const tierLimits = {
    1: 3
    //,
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
      reason: `You've reached today's limit for 1 PI duels (${limit}). Come back tomorrow and keep battling! \u{1F680}`,
      limit,
      total,
      entry_tier: entry
    };
  }
  return { ok: true, limit, total, entry_tier: entry };
}
__name(assertDailyDuelTierLimit, "assertDailyDuelTierLimit");

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

// .wrangler/tmp/bundle-ofgXX7/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-ofgXX7/middleware-loader.entry.ts
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
