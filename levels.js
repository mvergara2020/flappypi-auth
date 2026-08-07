const LEGACY_RANK_META = [
  { rank: 1, icon: "🥚", name: "Newborn Spark", flamesRequired: 0 },
  { rank: 2, icon: "🐣", name: "First Hatch", flamesRequired: 100 },
  { rank: 3, icon: "🌱", name: "Tiny Grower", flamesRequired: 250 },
  { rank: 4, icon: "🍃", name: "Light Drifter", flamesRequired: 470 },
  { rank: 5, icon: "🐥", name: "Soft Runner", flamesRequired: 790 },
  { rank: 6, icon: "🌤️", name: "Dawn Seeker", flamesRequired: 1240 },
  { rank: 7, icon: "🧭", name: "Path Finder", flamesRequired: 1840 },
  { rank: 8, icon: "🪶", name: "Feather Glide", flamesRequired: 2640 },
  { rank: 9, icon: "🏃", name: "Quick Starter", flamesRequired: 3690 },
  { rank: 10, icon: "🔥", name: "Flame Touch", flamesRequired: 5040 },

  { rank: 11, icon: "💫", name: "Spark Chaser", flamesRequired: 6740 },
  { rank: 12, icon: "⚡", name: "Fast Reflex", flamesRequired: 8840 },
  { rank: 13, icon: "🎯", name: "Sharp Aim", flamesRequired: 11440 },
  { rank: 14, icon: "🛡️", name: "Guarded Mind", flamesRequired: 14640 },
  { rank: 15, icon: "🧱", name: "Solid Step", flamesRequired: 18540 },
  { rank: 16, icon: "🌊", name: "Flow Rider", flamesRequired: 23240 },
  { rank: 17, icon: "🌀", name: "Spin Control", flamesRequired: 28840 },
  { rank: 18, icon: "🚀", name: "Lift Off", flamesRequired: 35440 },
  { rank: 19, icon: "🌟", name: "Bright Path", flamesRequired: 43140 },
  { rank: 20, icon: "🔶", name: "Rising Chick", flamesRequired: 52040 },

  { rank: 21, icon: "🧠", name: "Mind Builder", flamesRequired: 62540 },
  { rank: 22, icon: "⚙️", name: "System Learner", flamesRequired: 74240 },
  { rank: 23, icon: "🔗", name: "Chain Master", flamesRequired: 87240 },
  { rank: 24, icon: "🪜", name: "Step Climber", flamesRequired: 101640 },
  { rank: 25, icon: "🏹", name: "Precision Shot", flamesRequired: 117540 },
  { rank: 26, icon: "🗡️", name: "Blade Initiate", flamesRequired: 135040 },
  { rank: 27, icon: "🛠️", name: "Skill Crafter", flamesRequired: 154240 },
  { rank: 28, icon: "🔩", name: "Core Tight", flamesRequired: 175240 },
  { rank: 29, icon: "🧬", name: "Pattern Reader", flamesRequired: 198140 },
  { rank: 30, icon: "⚔️", name: "Combat Form", flamesRequired: 223040 },

  { rank: 31, icon: "🐺", name: "Lone Hunter", flamesRequired: 250040 },
  { rank: 32, icon: "🦅", name: "Sky Watcher", flamesRequired: 279240 },
  { rank: 33, icon: "🧨", name: "Burst Force", flamesRequired: 310740 },
  { rank: 34, icon: "🎮", name: "Game Sense", flamesRequired: 344640 },
  { rank: 35, icon: "🧿", name: "Focus Eye", flamesRequired: 381040 },
  { rank: 36, icon: "🏋️", name: "Strength Rise", flamesRequired: 420040 },
  { rank: 37, icon: "📡", name: "Signal Pulse", flamesRequired: 461740 },
  { rank: 38, icon: "🛰️", name: "Tracker", flamesRequired: 506240 },
  { rank: 39, icon: "☄️", name: "Flame Surge", flamesRequired: 553640 },
  { rank: 40, icon: "🔺", name: "Ascending Force", flamesRequired: 604040 },

  { rank: 41, icon: "🐉", name: "Flame Spirit", flamesRequired: 657540 },
  { rank: 42, icon: "🦾", name: "Power Grip", flamesRequired: 714240 },
  { rank: 43, icon: "🎭", name: "Dual Mind", flamesRequired: 774240 },
  { rank: 44, icon: "🪖", name: "War Ready", flamesRequired: 837640 },
  { rank: 45, icon: "🏰", name: "Fortress Core", flamesRequired: 904540 },
  { rank: 46, icon: "🧲", name: "Magnetic Force", flamesRequired: 975040 },
  { rank: 47, icon: "🧪", name: "Meta Thinker", flamesRequired: 1049240 },
  { rank: 48, icon: "🕶️", name: "Silent Killer", flamesRequired: 1127340 },
  { rank: 49, icon: "🔐", name: "Lock Breaker", flamesRequired: 1209440 },
  { rank: 50, icon: "👑", name: "Half King", flamesRequired: 1295640 },

  { rank: 51, icon: "🌋", name: "Volcanic Core", flamesRequired: 1386040 },
  { rank: 52, icon: "🦿", name: "Iron Step", flamesRequired: 1480740 },
  { rank: 53, icon: "🪙", name: "Value Hunter", flamesRequired: 1579840 },
  { rank: 54, icon: "🧊", name: "Cold Logic", flamesRequired: 1683440 },
  { rank: 55, icon: "🎲", name: "Risk Player", flamesRequired: 1791640 },
  { rank: 56, icon: "🧯", name: "Flame Balance", flamesRequired: 1904540 },
  { rank: 57, icon: "📘", name: "Deep Mind", flamesRequired: 2022240 },
  { rank: 58, icon: "🪓", name: "Executioner", flamesRequired: 2144840 },
  { rank: 59, icon: "🛞", name: "Unstoppable", flamesRequired: 2272440 },
  { rank: 60, icon: "🏆", name: "Elite Fighter", flamesRequired: 2405140 },

  { rank: 61, icon: "🦍", name: "Raw Power", flamesRequired: 2543040 },
  { rank: 62, icon: "🐆", name: "Speed Master", flamesRequired: 2686240 },
  { rank: 63, icon: "🪬", name: "Inner Sight", flamesRequired: 2834840 },
  { rank: 64, icon: "🎖️", name: "Perfect Aim", flamesRequired: 2988940 },
  { rank: 65, icon: "🌞", name: "Inferno Core", flamesRequired: 3148640 },
  { rank: 66, icon: "🗿", name: "Meta Breaker", flamesRequired: 3314040 },
  { rank: 67, icon: "🛸", name: "Advanced Pulse", flamesRequired: 3485240 },
  { rank: 68, icon: "🪫", name: "Control Field", flamesRequired: 3662340 },
  { rank: 69, icon: "📯", name: "Wall Breaker", flamesRequired: 3845440 },
  { rank: 70, icon: "🌩️", name: "Storm Rider", flamesRequired: 4034640 },

  { rank: 71, icon: "🐲", name: "Dragon Pulse", flamesRequired: 4230040 },
  { rank: 72, icon: "🧠", name: "Evolution Mind", flamesRequired: 4431740 },
  { rank: 73, icon: "📍", name: "Target Master", flamesRequired: 4639840 },
  { rank: 74, icon: "🔋", name: "Energy Core", flamesRequired: 4854440 },
  { rank: 75, icon: "🗺️", name: "Global Vision", flamesRequired: 5075640 },
  { rank: 76, icon: "🧭", name: "Ultra Focus", flamesRequired: 5303540 },
  { rank: 77, icon: "⚙️", name: "System Break", flamesRequired: 5538240 },
  { rank: 78, icon: "🛡️", name: "Absolute Guard", flamesRequired: 5779840 },
  { rank: 79, icon: "🔥", name: "Final Heat", flamesRequired: 6028440 },
  { rank: 80, icon: "🌠", name: "Sky Champion", flamesRequired: 6284140 },

  { rank: 81, icon: "🌌", name: "Cosmic Step", flamesRequired: 6547040 },
  { rank: 82, icon: "🪐", name: "Orbit Mind", flamesRequired: 6817240 },
  { rank: 83, icon: "✨", name: "Pure Energy", flamesRequired: 7094840 },
  { rank: 84, icon: "🔮", name: "Omni Vision", flamesRequired: 7379940 },
  { rank: 85, icon: "🌀", name: "Reality Shift", flamesRequired: 7672640 },
  { rank: 86, icon: "🌙", name: "Void Walker", flamesRequired: 7973040 },
  { rank: 87, icon: "☀️", name: "God Mind", flamesRequired: 8281240 },
  { rank: 88, icon: "⚡", name: "Eternal Surge", flamesRequired: 8597340 },
  { rank: 89, icon: "🛸", name: "Beyond Player", flamesRequired: 8921440 },
  { rank: 90, icon: "🔱", name: "Tri Power", flamesRequired: 9253640 },

  { rank: 91, icon: "🧬", name: "Final Evolution", flamesRequired: 9594040 },
  { rank: 92, icon: "🌋", name: "Core Overload", flamesRequired: 9942740 },
  { rank: 93, icon: "⭐", name: "Star Breaker", flamesRequired: 10299840 },
  { rank: 94, icon: "⚛️", name: "Quantum Shift", flamesRequired: 10665440 },
  { rank: 95, icon: "👁️", name: "Infinite Sight", flamesRequired: 11039640 },
  { rank: 96, icon: "🪬", name: "Eternal Seal", flamesRequired: 11422540 },
  { rank: 97, icon: "⚡", name: "Absolute Energy", flamesRequired: 11814240 },
  { rank: 98, icon: "🔥", name: "Ultimate Flame", flamesRequired: 12214840 },
  { rank: 99, icon: "👑", name: "Final Watcher", flamesRequired: 12624440 },
  { rank: 100, icon: "🏁", name: "Flame Emperor", flamesRequired: 13043140 }
];
export const MAX_RANK_LEVEL = 999;

const EARLY_RANK_GAPS = Object.freeze({
  2: 100,
  3: 150,
  4: 220,
  5: 320,
  6: 450,
  7: 600,
  8: 800,
  9: 1050,
  10: 1350
});

const GENERATED_RANK_FAMILIES = Object.freeze([
  { from: 101, icon: "🚀", name: "Sky Forge" },
  { from: 200, icon: "💠", name: "Neon Orbit" },
  { from: 300, icon: "☀️", name: "Solar Rift" },
  { from: 400, icon: "🌌", name: "Cosmic Pulse" },
  { from: 500, icon: "⚛️", name: "Quantum Wing" },
  { from: 600, icon: "🕳️", name: "Void Runner" },
  { from: 700, icon: "🌠", name: "Astral Crown" },
  { from: 800, icon: "🔱", name: "Mythic Nova" },
  { from: 900, icon: "♾️", name: "Eternal Star" },
  { from: 950, icon: "👑", name: "Flappy Ascendant" }
]);

function roundRankStars(value) {
  return Math.round(Number(value || 0) / 50) * 50;
}

function interpolateRankGap(rank,from,to,minGap,maxGap) {
  const progress = (rank - from) / Math.max(1,to - from);
  return roundRankStars(minGap + (maxGap - minGap) * progress);
}

export function getStarsGapForRank(rankNumber) {
  const rank = Math.max(1,Math.min(MAX_RANK_LEVEL,Number(rankNumber) || 1));

  if (rank <= 1) return 0;
  if (rank <= 10) return EARLY_RANK_GAPS[rank];

  if (rank <= 20) {
    return 1600 + (rank - 11) * 300;
  }

  if (rank <= 50) {
    return interpolateRankGap(rank,21,50,4500,6000);
  }

  if (rank <= 100) {
    return interpolateRankGap(rank,51,100,6000,8000);
  }

  if (rank <= 300) {
    return interpolateRankGap(rank,101,300,8000,12000);
  }

  if (rank <= 600) {
    return interpolateRankGap(rank,301,600,12000,15000);
  }

  if (rank <= 900) {
    return interpolateRankGap(rank,601,900,15000,19000);
  }

  return interpolateRankGap(rank,901,999,19000,23000);
}

function getGeneratedRankMeta(rank) {
  const legacy = LEGACY_RANK_META[rank - 1];

  if (legacy) {
    return {
      icon: legacy.icon || "⭐",
      name: legacy.name || `Star Level ${rank}`
    };
  }

  let family = GENERATED_RANK_FAMILIES[0];

  for (const candidate of GENERATED_RANK_FAMILIES) {
    if (rank >= candidate.from) family = candidate;
    else break;
  }

  return {
    icon: family.icon,
    name: `${family.name} ${String(rank).padStart(3,"0")}`
  };
}

let cumulativeRankStars = 0;

export const RANK_LEVELS = Array.from({ length: MAX_RANK_LEVEL },(_,index) => {
  const rank = index + 1;

  if (rank > 1) {
    cumulativeRankStars += getStarsGapForRank(rank);
  }

  const meta = getGeneratedRankMeta(rank);

  return Object.freeze({
    rank,
    icon: meta.icon,
    name: meta.name,

    /*
      Nombre correcto nuevo.
    */
    starsRequired: cumulativeRankStars,

    /*
      Alias temporal para no romper el frontend ni getRankBundle().
      Más adelante podremos eliminar "flames".
    */
    flamesRequired: cumulativeRankStars
  });
});


export function buildArenaRewardForRank(rankNumber) {
  const rank = Math.max(1,Math.min(MAX_RANK_LEVEL,Number(rankNumber) || 1));

  let coins = 200;
  let spins = 0;

  /*
    Recompensa base de cada nivel.
  */
  if (rank >= 21) coins = 250;
  if (rank >= 101) coins = 300;
  if (rank >= 301) coins = 350;
  if (rank >= 601) coins = 400;
  if (rank >= 901) coins = 500;

  /*
    Cada cinco niveles:
    spin frecuente para mantener emoción.
  */
  if (rank % 5 === 0) {
    spins += 1;
  }

  /*
    Cada diez niveles:
    premio de monedas adicional.
  */
  if (rank % 10 === 0) {
    coins += 250;
  }

  /*
    Cada 25 niveles:
    un spin adicional.
  */
  if (rank % 25 === 0) {
    spins += 1;
  }

  /*
    Cada 50 niveles:
    cofre importante.
  */
  if (rank % 50 === 0) {
    coins += 750;
    spins += 1;
  }

  /*
    Cada 100 niveles:
    premio maestro.
  */
  if (rank % 100 === 0) {
    coins += 2000;
    spins += 3;
  }

  /*
    Nivel final.
  */
  if (rank === MAX_RANK_LEVEL) {
    coins += 9999;
    spins += 10;
  }

  let milestone = "LEVEL";

  if (rank === MAX_RANK_LEVEL) milestone = "FINAL";
  else if (rank % 100 === 0) milestone = "MASTER";
  else if (rank % 50 === 0) milestone = "MEGA";
  else if (rank % 25 === 0) milestone = "SPECIAL";
  else if (rank % 10 === 0) milestone = "ARENA";
  else if (rank % 5 === 0) milestone = "SPIN";

  return {
    coins,
    spins,
    milestone
  };
}
/**
 * Busca el rank actual según flamas acumuladas.
 * RANK_LEVELS debe estar ordenado por rank ascendente
 * y flamesRequired debe ser el mínimo acumulado para alcanzar ese rank.
 */
export function getRankFromFlames(totalFlames = 0) {
  const safeFlames = Math.max(0, Number(totalFlames) || 0);

  let current = RANK_LEVELS[0];

  for (let i = 0; i < RANK_LEVELS.length; i++) {
    const level = RANK_LEVELS[i];
    if (safeFlames >= level.flamesRequired) {
      current = level;
    } else {
      break;
    }
  }

  const next =
    RANK_LEVELS.find((level) => level.rank === current.rank + 1) || null;

  const currentBase = current.flamesRequired;
  const nextBase = next ? next.flamesRequired : currentBase;

  const span = next ? nextBase - currentBase : 0;
  const flamesIntoCurrent = Math.max(0, safeFlames - currentBase);
  const flamesNeededForNext = next ? Math.max(0, nextBase - safeFlames) : 0;

  const progressPercent =
    next && span > 0
      ? Math.max(0, Math.min(100, (flamesIntoCurrent / span) * 100))
      : 100;

  return {
    totalFlames: safeFlames,

    currentRank: current.rank,
    currentIcon: current.icon,
    currentName: current.name,
    currentFlamesRequired: current.flamesRequired,

    nextRank: next ? next.rank : null,
    nextIcon: next ? next.icon : null,
    nextName: next ? next.name : null,
    nextFlamesRequired: next ? next.flamesRequired : null,

    flamesIntoCurrent,
    flamesNeededForNext,
    progressPercent: Number(progressPercent.toFixed(2)),

    isMaxRank: current.rank === RANK_LEVELS[RANK_LEVELS.length - 1].rank,
  };
}

/**
 * Versión compacta si quieres solo el número de rank.
 */
export function getRankNumberFromFlames(totalFlames = 0) {
  return getRankFromFlames(totalFlames).currentRank;
}

/**
 * Devuelve algunos hitos útiles para UI.
 */
export function getRankMilestones() {
  const milestoneRanks = [10, 20, 50, 80, 100];
  return RANK_LEVELS.filter((level) => milestoneRanks.includes(level.rank));
}

export function getRankBundle(totalFlames = 0) {
  const safeFlames = Math.max(0, Number(totalFlames) || 0);

  let current = RANK_LEVELS[0];

  for (const level of RANK_LEVELS) {
    if (safeFlames >= level.flamesRequired) {
      current = level;
    } else {
      break;
    }
  }

  const previous = RANK_LEVELS.find(l => l.rank === current.rank - 1) || null;
  const next = RANK_LEVELS.find(l => l.rank === current.rank + 1) || null;

  const currentBase = current.flamesRequired;
  const nextBase = next ? next.flamesRequired : current.flamesRequired;

  const span = next ? (nextBase - currentBase) : 0;
  const flamesIntoCurrent = Math.max(0, safeFlames - currentBase);
  const flamesNeededForNext = next ? Math.max(0, nextBase - safeFlames) : 0;

  const progressPercent =
    next && span > 0
      ? Math.max(0, Math.min(100, (flamesIntoCurrent / span) * 100))
      : 100;

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
