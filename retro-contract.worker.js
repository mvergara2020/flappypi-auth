const RETRO_GAME_TYPE="flappy_retro";
const RETRO_PLAN_VERSION="retro-15-100-v1";
const MAX_STAGE=999;
const MIN_BASE_SEC=5;
const MIN_SEC_PER_PIPE=.35;
const MAX_PIPES_PER_SEC=3;
const TIME_GRACE_PIPES=3;
const ALLOWED_ORIGINS=new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.81:3000",
  "https://192.168.1.81:3000",
  "https://qa.classic.flappypi.com",
  "https://classic.flappypi.com"
]);

function normalizeGameType(value){
  return String(value||"").trim().toLowerCase().replace(/-/g,"_").replace(/[^a-z0-9_]/g,"");
}

function clampStage(value){
  return Math.max(1,Math.min(MAX_STAGE,Math.floor(Number(value)||1)));
}

export function retroTargetForStage(stage=1){
  const value=clampStage(stage);
  return Math.max(15,Math.min(100,Math.round(15+85*(value-1)/(MAX_STAGE-1))));
}

function decodeBase64Url(value){
  const normalized=String(value||"").replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(String(value||"").length/4)*4,"=");
  return Uint8Array.from(atob(normalized),char=>char.charCodeAt(0));
}

function encodeBase64Url(value){
  const bytes=value instanceof Uint8Array?value:new TextEncoder().encode(String(value));
  let binary="";
  for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}

async function verifyJWT(token,secret){
  const parts=String(token||"").split(".");
  if(parts.length!==3)throw new Error("JWT_FORMAT");
  const [header64,payload64,signature64]=parts;
  const data=`${header64}.${payload64}`;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(String(secret||"")),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  const valid=await crypto.subtle.verify("HMAC",key,decodeBase64Url(signature64),new TextEncoder().encode(data));
  if(!valid)throw new Error("JWT_SIGNATURE");
  const payload=JSON.parse(new TextDecoder().decode(decodeBase64Url(payload64)));
  if(payload?.exp&&Number(payload.exp)<Math.floor(Date.now()/1000))throw new Error("JWT_EXPIRED");
  return payload;
}

async function signJWT(payload,secret){
  const header64=encodeBase64Url(JSON.stringify({alg:"HS256",typ:"JWT"}));
  const payload64=encodeBase64Url(JSON.stringify(payload));
  const data=`${header64}.${payload64}`;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(String(secret||"")),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(data)));
  return `${data}.${encodeBase64Url(signature)}`;
}

function responseWithJson(response,data){
  const headers=new Headers(response.headers);
  headers.delete("Content-Length");
  headers.set("Content-Type","application/json; charset=utf-8");
  headers.set("Cache-Control","no-store");
  headers.set("X-FlappyPi-Retro-Contract",RETRO_PLAN_VERSION);
  return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
}

function jsonError(request,body,status){
  const headers=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-FlappyPi-Retro-Contract":RETRO_PLAN_VERSION});
  const origin=request.headers.get("Origin")||"";
  if(ALLOWED_ORIGINS.has(origin)){
    headers.set("Access-Control-Allow-Origin",origin);
    headers.set("Access-Control-Allow-Credentials","true");
    headers.set("Vary","Origin");
  }
  return new Response(JSON.stringify({ok:false,success:false,...body}),{status,headers});
}

function readRunDurationSec(payload){
  const startedAt=Number(payload?.startedAt||payload?.started_at||0);
  if(!Number.isFinite(startedAt)||startedAt<=0)return NaN;
  return Math.max(0,(Date.now()-startedAt)/1000);
}

async function getMaxUnlocked(env,userId){
  const row=await env.DB.prepare(`
    SELECT max_level_unlocked
    FROM user_game_progress
    WHERE user_id = ? AND game_type = ?
    LIMIT 1
  `).bind(String(userId),RETRO_GAME_TYPE).first();
  return clampStage(row?.max_level_unlocked||1);
}

async function applyRetroProgress(env,payload){
  const userId=String(payload.sub||"");
  const completedStage=clampStage(payload.level_id);
  const currentMax=await getMaxUnlocked(env,userId);
  const terminal=completedStage>=MAX_STAGE;

  if(completedStage!==currentMax){
    return {
      completed:true,
      advanced:false,
      duplicate:completedStage===currentMax-1,
      terminal:terminal&&currentMax===MAX_STAGE,
      completed_level:completedStage,
      max_level_unlocked:currentMax,
      next_level:currentMax<MAX_STAGE?currentMax:null
    };
  }

  const nextMax=terminal?MAX_STAGE:completedStage+1;
  const now=Date.now();
  await env.DB.prepare(`
    INSERT INTO user_game_progress (
      user_id, game_type, max_level_unlocked, last_selected_level, updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, game_type)
    DO UPDATE SET
      max_level_unlocked = CASE
        WHEN excluded.max_level_unlocked > user_game_progress.max_level_unlocked
        THEN excluded.max_level_unlocked
        ELSE user_game_progress.max_level_unlocked
      END,
      last_selected_level = excluded.last_selected_level,
      updated_at = excluded.updated_at
  `).bind(userId,RETRO_GAME_TYPE,nextMax,nextMax,now).run();

  return {
    completed:true,
    advanced:true,
    duplicate:false,
    terminal,
    completed_level:completedStage,
    max_level_unlocked:nextMax,
    next_level:terminal?null:nextMax
  };
}

async function readJson(request){
  try{return await request.clone().json()}catch(_){return null}
}

export async function prepareRetroContractRequest(request,env){
  const url=new URL(request.url);
  if(request.method!=="POST"||!["/game/start","/game/finish"].includes(url.pathname))return {request,kind:null,body:null};

  const body=await readJson(request);
  if(!body)return {request,kind:null,body:null};
  const requestedGame=normalizeGameType(body.game_type);

  if(url.pathname==="/game/start")return requestedGame===RETRO_GAME_TYPE?{request,kind:"start",body}:{request,kind:null,body};

  let payload;
  try{payload=await verifyJWT(body.gameToken,env.JWT_SECRET)}catch(_){return {request,kind:null,body}}

  const gameType=normalizeGameType(payload?.game_type||requestedGame);
  if(gameType!==RETRO_GAME_TYPE||String(payload?.mode||body.mode||"")!=="levels")return {request,kind:null,body};

  const stage=Number(payload.level_id||0);
  if(!Number.isInteger(stage)||stage<1||stage>MAX_STAGE){
    return {request,kind:"finish",body,payload,rejection:jsonError(request,{code:"RETRO_STAGE_CONTEXT_INVALID",stage},409)};
  }

  const target=retroTargetForStage(stage);
  const completeGame=body.complete_game===true;
  if(!completeGame)return {request,kind:"finish",body,payload,target,completeGame:false};

  const signedTarget=Number(payload.stage_target);
  const signedPlanVersion=String(payload.level_plan_version||"");
  if(signedTarget!==target||signedPlanVersion!==RETRO_PLAN_VERSION){
    return {request,kind:"finish",body,payload,target,completeGame:true,rejection:jsonError(request,{
      code:"RETRO_STAGE_CONTRACT_INVALID",message:"Retro stage contract is not valid",stage,target,signed_target:signedTarget||null,level_plan_version:signedPlanVersion||null
    },409)};
  }

  const pipesPassed=Number(body.pipes_passed??body.difficulty_pipes_passed??body.score??0);
  const durationSec=readRunDurationSec(payload);
  const minimumDurationSec=Math.max(Math.min(MIN_BASE_SEC,target),target*MIN_SEC_PER_PIPE);

  if(!Number.isInteger(pipesPassed)||pipesPassed<target){
    return {request,kind:"finish",body,payload,target,completeGame:true,rejection:jsonError(request,{
      code:"RETRO_PIPES_BELOW_STAGE_TARGET",message:"Retro stage target not reached",stage,target,pipes_passed:Math.max(0,Number(pipesPassed||0)),level_plan_version:RETRO_PLAN_VERSION
    },409)};
  }

  if(!Number.isFinite(durationSec)||durationSec<minimumDurationSec||pipesPassed>durationSec*MAX_PIPES_PER_SEC+TIME_GRACE_PIPES){
    return {request,kind:"finish",body,payload,target,completeGame:true,rejection:jsonError(request,{
      code:"RETRO_STAGE_TIME_ANOMALY",message:"Retro stage timing is not valid",stage,target,pipes_passed:pipesPassed,duration_sec:durationSec,minimum_duration_sec:minimumDurationSec,level_plan_version:RETRO_PLAN_VERSION
    },403)};
  }

  const maxUnlocked=await getMaxUnlocked(env,String(payload.sub));
  const isCurrentStage=stage===maxUnlocked;
  const isCompletedStageRetry=stage===maxUnlocked-1;
  if(!isCurrentStage&&!isCompletedStageRetry){
    return {request,kind:"finish",body,payload,target,completeGame:true,rejection:jsonError(request,{
      code:"RETRO_LEVEL_NOT_UNLOCKED",requested_level:stage,max_level_unlocked:maxUnlocked
    },409)};
  }

  const rewrittenBody={
    ...body,
    game_type:RETRO_GAME_TYPE,
    mode:"levels",
    level_id:stage,
    pipes_passed:pipesPassed,
    difficulty_pipes_passed:pipesPassed,
    complete_game:false,
    retro_complete_game:true,
    retro_stage_target:target,
    retro_level_plan_version:RETRO_PLAN_VERSION
  };
  const headers=new Headers(request.headers);
  headers.delete("Content-Length");
  headers.set("Content-Type","application/json");
  const rewrittenRequest=new Request(request,{body:JSON.stringify(rewrittenBody),headers});
  return {request:rewrittenRequest,kind:"finish",body,payload,target,completeGame:true,pipesPassed};
}

async function decorateStartResponse(response,env,context){
  if(!response.ok)return response;
  let data;
  try{data=await response.clone().json()}catch(_){return response}
  if(data?.success===false||data?.ok===false)return response;
  const token=String(data?.gameToken||data?.game_token||data?.token||"");
  if(!token)return response;

  let payload;
  try{payload=await verifyJWT(token,env.JWT_SECRET)}catch(_){return response}
  if(normalizeGameType(payload?.game_type||context.body?.game_type)!==RETRO_GAME_TYPE)return response;

  const stage=clampStage(payload.level_id||context.body?.level_id||1);
  const target=retroTargetForStage(stage);
  const signedPayload={...payload,stage_target:target,level_plan_version:RETRO_PLAN_VERSION};
  const signedToken=await signJWT(signedPayload,env.JWT_SECRET);
  data.gameToken=signedToken;
  if(Object.prototype.hasOwnProperty.call(data,"game_token"))data.game_token=signedToken;
  if(Object.prototype.hasOwnProperty.call(data,"token"))data.token=signedToken;
  data.stage_target=target;
  data.level_plan_version=RETRO_PLAN_VERSION;
  return responseWithJson(response,data);
}

async function decorateFinishResponse(response,env,context){
  if(!context.completeGame||!response.ok)return response;
  let data;
  try{data=await response.clone().json()}catch(_){return response}
  if(data?.success===false||data?.ok===false)return response;

  const level=await applyRetroProgress(env,context.payload);
  data.ok=data.ok!==false;
  data.success=data.success!==false;
  data.game_type=RETRO_GAME_TYPE;
  data.level=level;
  data.stage_target=context.target;
  data.level_plan_version=RETRO_PLAN_VERSION;
  data.retro_contract_applied=true;
  return responseWithJson(response,data);
}

export async function finalizeRetroContractResponse(response,env,context){
  if(!context?.kind)return response;
  if(context.kind==="start")return decorateStartResponse(response,env,context);
  if(context.kind==="finish")return decorateFinishResponse(response,env,context);
  return response;
}

export {RETRO_GAME_TYPE,RETRO_PLAN_VERSION};
