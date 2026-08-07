import fs from "node:fs";

const file = "worker.js";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  "const MAX_LEVEL_CAP = 50; //ACTUALIZAR PRODUCCION",
  "const MAX_LEVEL_CAP = 999;",
  "MAX_LEVEL_CAP"
);

replaceOnce(
  `flappy_classic: makeGame({\n    ...FLAPPY_PIPE_RULES,\n    scoringVersion: "flappy-pipes-v1",\n    maxLevel: 50,`,
  `flappy_classic: makeGame({\n    ...FLAPPY_PIPE_RULES,\n    scoringVersion: "flappy-pipes-v1",\n    maxLevel: 999,`,
  "flappy_classic maxLevel"
);

replaceOnce(
  `webcam_flappy: makeGame({\n    ...FLAPPY_PIPE_RULES,\n    scoringVersion: "webcam-flappy-pipes-v1",\n    maxLevel: 50,`,
  `webcam_flappy: makeGame({\n    ...FLAPPY_PIPE_RULES,\n    scoringVersion: "webcam-flappy-pipes-v1",\n    maxLevel: 999,`,
  "webcam_flappy maxLevel"
);

replaceOnce(
  "const LEVEL_DEFINITION = {",
  "const FLAPPY_STAGE_TEMPLATES = {",
  "LEVEL_DEFINITION declaration"
);

const marker = "\n};\n\nfunction getEffectivePiAmount";
const markerIndex = source.indexOf(marker, source.indexOf("const FLAPPY_STAGE_TEMPLATES = {"));
if (markerIndex < 0) throw new Error("Missing FLAPPY_STAGE_TEMPLATES closing marker");

const generator = `\n};\n\n/* =========================================================\n   FLAPPY CLASSIC - 999 STAGES\n   STAGE N requires N real pipes / N official PTS.\n   Mechanics reuse the original 50-stage templates cyclically.\n========================================================= */\nfunction buildFlappyClassicStages(maxStage = 999) {\n  const stages = {};\n\n  for (let stage = 1; stage <= maxStage; stage++) {\n    const templateStage = ((stage - 1) % 50) + 1;\n    const template = FLAPPY_STAGE_TEMPLATES[templateStage] || FLAPPY_STAGE_TEMPLATES[1];\n\n    stages[stage] = Object.freeze({\n      ...template,\n      pipes_target: stage,\n      stage_id: stage,\n      template_stage: templateStage\n    });\n  }\n\n  stages[0] = Object.freeze({ ...FLAPPY_STAGE_TEMPLATES[0] });\n  stages[99999] = Object.freeze({ ...FLAPPY_STAGE_TEMPLATES[99999] });\n\n  return Object.freeze(stages);\n}\n\nconst LEVEL_DEFINITION = buildFlappyClassicStages(999);\n\nfunction getEffectivePiAmount`;
source = source.slice(0, markerIndex) + generator + source.slice(markerIndex + marker.length);

replaceOnce(
  "const minDurationSec = Math.max(MIN_BASE_SEC, target * MIN_SEC_PER_PIPE);",
  "const minDurationSec = Math.max(Math.min(MIN_BASE_SEC, target), target * MIN_SEC_PER_PIPE);",
  "completion minimum duration"
);

if (!source.includes("const LEVEL_DEFINITION = buildFlappyClassicStages(999);")) {
  throw new Error("999 stage generator was not installed");
}

fs.writeFileSync(file, source);
console.log("Flappy Classic 999 stages installed.");
