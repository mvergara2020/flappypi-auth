import appWorker from "./worker-app.js";
import {routeShopCatalog} from "./shop-catalog.worker.js";
import {enforceThreeStarsResponse} from "./game-three-stars.worker.js";
import {routeRetroGameTop} from "./retro-top.worker.js";
import {finalizeRetroContractResponse,prepareRetroContractRequest} from "./retro-contract.worker.js";

const ENTRY_VERSION="2026-08-27-retro-contract-v9";
let threeStarSchemaPromise=null;

function allowedOrigin(request){
  const origin=request.headers.get("Origin")||"";
  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.81:3000",
    "https://192.168.1.81:3000",
    "https://qa.classic.flappypi.com",
    "https://classic.flappypi.com"
  ].includes(origin)?origin:"";
}

function ensureThreeStarTable(env){
  if(threeStarSchemaPromise)return threeStarSchemaPromise;
  threeStarSchemaPromise=env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS game_stage_star_rewards (
      game_uid TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      level_id INTEGER NOT NULL,
      stars INTEGER NOT NULL,
      performance TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      applied_at INTEGER
    )
  `).run().catch(error=>{
    threeStarSchemaPromise=null;
    throw error;
  });
  return threeStarSchemaPromise;
}

function diagnosticJson(request,body,status=200,extraHeaders={}){
  const text=JSON.stringify(body,null,2);
  const headers=new Headers({
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-FlappyPi-Entry":ENTRY_VERSION,
    ...extraHeaders
  });
  const origin=allowedOrigin(request);
  if(origin){
    headers.set("Access-Control-Allow-Origin",origin);
    headers.set("Access-Control-Allow-Credentials","true");
    headers.set("Vary","Origin");
  }
  return new Response(text,{status,headers});
}

function finalizeResponse(response,route="app"){
  if(!(response instanceof Response))return response;
  const headers=new Headers(response.headers);
  headers.delete("Content-Length");
  headers.set("X-FlappyPi-Entry",ENTRY_VERSION);
  headers.set("X-FlappyPi-Route",route);
  headers.set("X-FlappyPi-Response-Framing","auto");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function decorateShopResponse(response,startedAt,path){
  const text=await response.text();
  const bytes=new TextEncoder().encode(text).byteLength;
  const elapsed=Date.now()-startedAt;
  const headers=new Headers(response.headers);
  headers.delete("Content-Length");
  headers.set("X-FlappyPi-Entry",ENTRY_VERSION);
  headers.set("X-FlappyPi-Route","shop-catalog");
  headers.set("X-FlappyPi-Path",path);
  headers.set("X-FlappyPi-Response-Bytes",String(bytes));
  headers.set("X-FlappyPi-Elapsed-Ms",String(elapsed));
  headers.set("X-FlappyPi-Response-Framing","auto");
  console.log("[SHOP CATALOG RESPONSE]",{path,status:response.status,bytes,elapsed_ms:elapsed});
  return new Response(text,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request,env,ctx){
    const startedAt=Date.now();
    const url=new URL(request.url);
    const path=url.pathname;
    const requestId=crypto.randomUUID().slice(0,8);
    console.log("[WORKER REQUEST]",{request_id:requestId,method:request.method,path,env:env?.ENV||null,entry:ENTRY_VERSION});

    if(path==="/__debug/runtime"){
      return diagnosticJson(request,{
        ok:true,
        request_id:requestId,
        entry:ENTRY_VERSION,
        env:env?.ENV||null,
        has_db:!!env?.DB,
        has_queue:!!env?.GAME_POINTS_QUEUE,
        has_telegram_photo_queue:!!env?.TELEGRAM_PHOTO_QUEUE,
        has_r2:!!env?.GAME_PHOTOS,
        telegram_environment:env?.PHOTO_TELEGRAM_ENV||null,
        telegram_enabled:String(env?.TELEGRAM_ENABLED||"").toLowerCase()==="true",
        telegram_local_enabled:String(env?.TELEGRAM_LOCAL_ENABLED||"").toLowerCase()==="true",
        has_telegram_bot_token:!!String(env?.TELEGRAM_BOT_TOKEN||"").trim(),
        has_telegram_chat_id:!!String(env?.TELEGRAM_CHAT_ID||"").trim(),
        has_coingecko_demo_key:!!String(env?.COINGECKO_DEMO_API_KEY||"").trim(),
        url:request.url,
        now:Date.now()
      },200,{"X-FlappyPi-Route":"runtime-diagnostic","X-FlappyPi-Response-Framing":"auto"});
    }

    const retroTopResponse=await routeRetroGameTop(request,env,url);
    if(retroTopResponse)return finalizeResponse(retroTopResponse,"retro-top");

    const shopResponse=await routeShopCatalog(request,env,url);
    if(shopResponse)return decorateShopResponse(shopResponse,startedAt,path);

    console.log("[WORKER DELEGATE]",{request_id:requestId,path,elapsed_ms:Date.now()-startedAt});

    if(request.method==="POST"&&["/game/stage/finish","/game/stage-stars"].includes(path)&&env?.DB){
      await ensureThreeStarTable(env);
    }

    const rewardRequest=request.clone();
    const retroContext=await prepareRetroContractRequest(request,env);
    if(retroContext.rejection)return finalizeResponse(retroContext.rejection,"retro-contract-reject");

    let response=await appWorker.fetch(retroContext.request,env,ctx);
    response=await finalizeRetroContractResponse(response,env,retroContext);
    response=await enforceThreeStarsResponse(rewardRequest,response,env);
    return finalizeResponse(response,retroContext.kind?"retro-contract":"app");
  },

  async queue(batch,env,ctx){
    return appWorker.queue(batch,env,ctx);
  }
};
