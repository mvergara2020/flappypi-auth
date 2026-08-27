import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const source=await readFile(new URL("../retro-contract.worker.js",import.meta.url),"utf8");
const executable=source
  .replace(/\bexport\s+(?=(?:const|let|var|class|function)\b)/g,"")
  .replace(/\bexport\s*\{[^}]*\};?/g,"");
assert.doesNotThrow(()=>new Function(executable),"retro-contract.worker.js must parse");
const contract=new Function(`${executable}\nreturn {retroTargetForStage,RETRO_GAME_TYPE,RETRO_PLAN_VERSION};`)();

assert.equal(contract.RETRO_GAME_TYPE,"flappy_retro");
assert.equal(contract.RETRO_PLAN_VERSION,"retro-15-100-v1");
assert.equal(contract.retroTargetForStage(1),15);
assert.equal(contract.retroTargetForStage(3),15);
assert.equal(contract.retroTargetForStage(4),15);
assert.equal(contract.retroTargetForStage(100),23);
assert.equal(contract.retroTargetForStage(500),58);
assert.equal(contract.retroTargetForStage(999),100);
for(let stage=1;stage<=999;stage++){
  const target=contract.retroTargetForStage(stage);
  assert.ok(Number.isInteger(target));
  assert.ok(target>=15&&target<=100);
  if(stage>1)assert.ok(target>=contract.retroTargetForStage(stage-1));
}

console.log("Retro signed target contract OK");
