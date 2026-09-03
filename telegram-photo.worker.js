import { getStoredImage } from "./media-storage.worker.js";

const TELEGRAM_JOB_KIND = "game-photo-telegram-v1";
const TELEGRAM_CAPTION_MAX_CHARS = 1024;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const schemaPromises = new Map();

const GAME_LABELS = new Map([
  ["flappy_classic", "Flappy Classic"],
  ["webcam_flappy", "Webcam Flappy"],
  ["finger_trace", "Finger Trace"],
  ["fruits_memory", "Fruits Memory"],
  ["snake_999", "Snake 999"],
  ["jelly_fusion", "Jelly Fusion"],
  ["fusion_999", "Fusion 999"],
  ["tetriz_999", "Tetriz 999"],
  ["flappypi_999", "FlappyPi 999"]
]);

function safeText(value, max = 500) {
  return Array.from(String(value ?? "").trim()).slice(0, max).join("");
}

function safeErrorMessage(error, token = "") {
  const raw = String(error?.message || error || "Telegram delivery failed");
  const redacted = token ? raw.split(token).join("[REDACTED]") : raw;
  return safeText(redacted, 500) || "Telegram delivery failed";
}

function truthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

function normalizeEnvironment(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["qa", "test", "testing", "testnet"].includes(normalized)) return "testnet";
  if (["prod", "production", "main", "mainnet"].includes(normalized)) return "mainnet";
  return "localhost";
}

function requestIsLocal(requestUrl) {
  try {
    const hostname = new URL(requestUrl).hostname.toLowerCase();
    if (LOCAL_HOSTS.has(hostname) || hostname.endsWith(".local")) return true;

    const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const octets = ipv4.slice(1).map(Number);
      if (octets.some(part => part < 0 || part > 255)) return false;
      if (octets[0] === 10 || octets[0] === 127) return true;
      if (octets[0] === 192 && octets[1] === 168) return true;
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
      if (octets[0] === 169 && octets[1] === 254) return true;
    }

    const ipv6 = hostname.replace(/^\[|\]$/g, "");
    return ipv6.startsWith("fc") || ipv6.startsWith("fd") || ipv6.startsWith("fe80:");
  } catch (_) {
    return false;
  }
}

export function resolveTelegramPhotoEnvironment(env, requestUrl = "") {
  if (requestUrl && requestIsLocal(requestUrl)) return "localhost";
  return normalizeEnvironment(env?.PHOTO_TELEGRAM_ENV || env?.ENV);
}

function environmentBadge(environment) {
  if (environment === "mainnet") return "LIVE";
  if (environment === "testnet") return "TESTNET";
  return "LOCAL BUILD";
}

function escapeTelegramHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function telegramConfig(env, environment) {
  const enabled = environment === "localhost"
    ? truthy(env?.TELEGRAM_LOCAL_ENABLED)
    : truthy(env?.TELEGRAM_ENABLED);

  return {
    enabled,
    token: safeText(env?.TELEGRAM_BOT_TOKEN, 256),
    chatId: safeText(env?.TELEGRAM_CHAT_ID, 128),
    messageThreadId: safeText(env?.TELEGRAM_MESSAGE_THREAD_ID, 32)
  };
}

async function ensureTelegramDeliverySchema(env, environment) {
  if (!env?.DB) throw new Error("TELEGRAM_DB_NOT_CONFIGURED");
  const key = normalizeEnvironment(environment);
  if (schemaPromises.has(key)) return schemaPromises.get(key);

  const promise = (async () => {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS game_photo_telegram_deliveries (
        photo_id TEXT NOT NULL,
        environment TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        telegram_chat_id TEXT,
        telegram_message_id TEXT,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        sent_at INTEGER,
        PRIMARY KEY (photo_id, environment)
      )
    `).run();
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_game_photo_telegram_status
      ON game_photo_telegram_deliveries (environment, status, updated_at)
    `).run();
  })().catch(error => {
    schemaPromises.delete(key);
    throw error;
  });

  schemaPromises.set(key, promise);
  return promise;
}

async function upsertDelivery(env, data) {
  const now = Date.now();
  await env.DB.prepare(`
    INSERT INTO game_photo_telegram_deliveries (
      photo_id, environment, status, attempts, telegram_chat_id,
      telegram_message_id, last_error, created_at, updated_at, sent_at
    ) VALUES (?, ?, ?, 0, ?, NULL, ?, ?, ?, NULL)
    ON CONFLICT(photo_id, environment) DO UPDATE SET
      status = CASE
        WHEN game_photo_telegram_deliveries.status = 'sent' THEN 'sent'
        ELSE excluded.status
      END,
      telegram_chat_id = excluded.telegram_chat_id,
      last_error = CASE
        WHEN game_photo_telegram_deliveries.status = 'sent' THEN game_photo_telegram_deliveries.last_error
        ELSE excluded.last_error
      END,
      updated_at = excluded.updated_at
  `).bind(
    data.photoId,
    data.environment,
    data.status,
    data.chatId || null,
    data.lastError || null,
    now,
    now
  ).run();
}

async function updateDelivery(env, photoId, environment, fields) {
  const assignments = [];
  const values = [];
  for (const [column, value] of Object.entries(fields)) {
    assignments.push(`${column} = ?`);
    values.push(value);
  }
  assignments.push("updated_at = ?");
  values.push(Date.now(), photoId, environment);
  await env.DB.prepare(`
    UPDATE game_photo_telegram_deliveries
    SET ${assignments.join(", ")}
    WHERE photo_id = ? AND environment = ?
  `).bind(...values).run();
}

export async function enqueueTelegramPhoto(env, photo, requestUrl = "") {
  const environment = resolveTelegramPhotoEnvironment(env, requestUrl);
  const config = telegramConfig(env, environment);
  await ensureTelegramDeliverySchema(env, environment);

  if (!config.enabled) {
    await upsertDelivery(env, {
      photoId: photo.photoId,
      environment,
      status: "disabled",
      chatId: config.chatId,
      lastError: null
    });
    return { environment, enabled: false, status: "disabled" };
  }

  const missing = [];
  if (!config.token) missing.push("TELEGRAM_BOT_TOKEN");
  if (!config.chatId) missing.push("TELEGRAM_CHAT_ID");
  if (!env?.TELEGRAM_PHOTO_QUEUE || typeof env.TELEGRAM_PHOTO_QUEUE.send !== "function") {
    missing.push("TELEGRAM_PHOTO_QUEUE");
  }

  if (missing.length) {
    const lastError = `Missing configuration: ${missing.join(", ")}`;
    await upsertDelivery(env, {
      photoId: photo.photoId,
      environment,
      status: "configuration_missing",
      chatId: config.chatId,
      lastError
    });
    console.warn("[TELEGRAM PHOTO CONFIGURATION MISSING]", {
      photo_id: photo.photoId,
      environment,
      missing
    });
    return { environment, enabled: true, status: "configuration_missing" };
  }

  await upsertDelivery(env, {
    photoId: photo.photoId,
    environment,
    status: "queued",
    chatId: config.chatId,
    lastError: null
  });

  try {
    await env.TELEGRAM_PHOTO_QUEUE.send({
      kind: TELEGRAM_JOB_KIND,
      photo_id: photo.photoId,
      environment,
      queued_at: Date.now()
    });
    return { environment, enabled: true, status: "queued" };
  } catch (error) {
    const message = safeText(error?.message || error, 500) || "Queue send failed";
    await updateDelivery(env, photo.photoId, environment, {
      status: "enqueue_failed",
      last_error: message
    });
    console.error("[TELEGRAM PHOTO QUEUE SEND FAILED]", {
      photo_id: photo.photoId,
      environment,
      message
    });
    return { environment, enabled: true, status: "enqueue_failed" };
  }
}

export function isTelegramPhotoBatch(batch) {
  const queueName = String(batch?.queue || "").toLowerCase();
  if (queueName.includes("photo-telegram")) return true;
  const messages = Array.isArray(batch?.messages) ? batch.messages : [];
  return messages.length > 0 && messages.every(message => message?.body?.kind === TELEGRAM_JOB_KIND);
}

function gameLabel(gameType) {
  const normalized = safeText(gameType, 64).toLowerCase();
  if (GAME_LABELS.has(normalized)) return GAME_LABELS.get(normalized);
  return normalized
    .split(/[_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "FlappyPi";
}

export function buildTelegramPhotoCaption(row, environment) {
  const rawUsername = safeText(row.user_name, 80).replace(/^@+/, "");
  const displayName = rawUsername
    ? `@${rawUsername}`
    : safeText(row.name, 80) || "FlappyPi player";
  const stage = Math.max(0, Number(row.stage || 0));
  const points = Math.max(0, Number(row.total_points || 0));
  const comment = safeText(row.comment, 100);

  const camera = "\u{1F4F8}";
  const gamepad = "\u{1F3AE}";
  const player = "\u{1F464}";
  const flag = "\u{1F3C1}";
  const star = "\u2B50";
  const quote = "\u{1F4AC}";
  const fire = "\u{1F525}";
  const momentId = safeText(row.photo_id, 36).split("-")[0].toUpperCase();
  const stageText = stage ? `STAGE ${stage}` : "ARCADE RUN";

  const lines = [
    `${camera} <b>FLAPPYPI PLAYER MOMENT</b>`,
    `<code>${escapeTelegramHtml(environmentBadge(environment))}  /  ${escapeTelegramHtml(gameLabel(row.game_type).toUpperCase())}</code>`,
    "",
    `${gamepad} <b>${escapeTelegramHtml(gameLabel(row.game_type))}</b>`,
    `${player} ${escapeTelegramHtml(displayName)}`,
    `${flag} ${escapeTelegramHtml(stageText)}   ${star} <b>${points.toLocaleString("en-US")} PTS</b>`
  ];
  if (comment) {
    lines.push("", `${quote} <i>\u201C${escapeTelegramHtml(comment)}\u201D</i>`);
  }
  lines.push(
    "",
    `<code>MOMENT ${escapeTelegramHtml(momentId)}</code>`,
    `${fire} <b>PLAY. SCORE. SHARE.</b>`
  );
  return Array.from(lines.join("\n")).slice(0, TELEGRAM_CAPTION_MAX_CHARS).join("");
}

async function loadPhoto(env, photoId) {
  return env.DB.prepare(`
    SELECT
      p.photo_id, p.owner_user_id, p.game_type, p.stage, p.total_points,
      p.storage_key, p.content_type, p.comment, p.created_at,
      u.user_name, u.name
    FROM game_photos p
    LEFT JOIN users u ON u.id = p.owner_user_id
    WHERE p.photo_id = ?
    LIMIT 1
  `).bind(photoId).first();
}

async function sendPhotoToTelegram(env, config, row, environment) {
  const object = await getStoredImage(env, row.storage_key);
  if (!object) {
    const error = new Error("PHOTO_OBJECT_NOT_FOUND");
    error.permanent = true;
    throw error;
  }

  const bytes = await object.arrayBuffer();
  const contentType = safeText(row.content_type, 80) || "image/jpeg";
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const form = new FormData();
  form.append("chat_id", config.chatId);
  if (config.messageThreadId) form.append("message_thread_id", config.messageThreadId);
  form.append("caption", buildTelegramPhotoCaption(row, environment));
  form.append("parse_mode", "HTML");
  form.append("photo", new Blob([bytes], { type: contentType }), `${row.photo_id}.${extension}`);

  let response;
  try {
    response = await fetch(`https://api.telegram.org/bot${config.token}/sendPhoto`, {
      method: "POST",
      body: form
    });
  } catch (error) {
    error.transient = true;
    throw error;
  }

  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true) {
    const error = new Error(safeText(result?.description, 500) || `Telegram HTTP ${response.status}`);
    error.status = response.status;
    error.retryAfter = Math.max(0, Number(result?.parameters?.retry_after || 0));
    error.transient = response.status === 429 || response.status >= 500;
    error.permanent = !error.transient;
    throw error;
  }

  return {
    messageId: String(result?.result?.message_id ?? ""),
    chatId: String(result?.result?.chat?.id ?? config.chatId)
  };
}

async function processTelegramMessage(message, env) {
  const job = message?.body || {};
  const photoId = safeText(job.photo_id, 36);
  const environment = normalizeEnvironment(job.environment || env?.PHOTO_TELEGRAM_ENV || env?.ENV);

  if (job.kind !== TELEGRAM_JOB_KIND || !photoId) {
    message.ack();
    return;
  }

  await ensureTelegramDeliverySchema(env, environment);
  const delivery = await env.DB.prepare(`
    SELECT status, attempts
    FROM game_photo_telegram_deliveries
    WHERE photo_id = ? AND environment = ?
    LIMIT 1
  `).bind(photoId, environment).first();

  if (delivery?.status === "sent") {
    message.ack();
    return;
  }

  const config = telegramConfig(env, environment);
  if (!config.enabled || !config.token || !config.chatId || (!env?.GAME_PHOTOS && !env?.IMAGES_BUCKET)) {
    await updateDelivery(env, photoId, environment, {
      status: "configuration_missing",
      last_error: "Telegram consumer configuration is incomplete"
    });
    message.ack();
    return;
  }

  const row = await loadPhoto(env, photoId);
  if (!row) {
    await updateDelivery(env, photoId, environment, {
      status: "failed",
      last_error: "PHOTO_DATABASE_ROW_NOT_FOUND"
    });
    message.ack();
    return;
  }

  await updateDelivery(env, photoId, environment, {
    status: "sending",
    attempts: Math.max(0, Number(delivery?.attempts || 0)) + 1,
    last_error: null
  });

  try {
    const sent = await sendPhotoToTelegram(env, config, row, environment);
    const now = Date.now();
    await updateDelivery(env, photoId, environment, {
      status: "sent",
      telegram_chat_id: sent.chatId,
      telegram_message_id: sent.messageId || null,
      last_error: null,
      sent_at: now
    });
    message.ack();
    console.log("[TELEGRAM PHOTO SENT]", {
      photo_id: photoId,
      environment,
      telegram_message_id: sent.messageId || null
    });
  } catch (error) {
    const errorMessage = safeErrorMessage(error, config.token);
    if (error?.permanent) {
      await updateDelivery(env, photoId, environment, {
        status: "failed",
        last_error: errorMessage
      });
      message.ack();
      console.error("[TELEGRAM PHOTO PERMANENT FAILURE]", {
        photo_id: photoId,
        environment,
        status: error?.status || null,
        message: errorMessage
      });
      return;
    }

    await updateDelivery(env, photoId, environment, {
      status: "retrying",
      last_error: errorMessage
    });
    const delaySeconds = Math.min(43200, Math.max(5, Number(error?.retryAfter || 15)));
    message.retry({ delaySeconds });
    console.warn("[TELEGRAM PHOTO RETRY]", {
      photo_id: photoId,
      environment,
      delay_seconds: delaySeconds,
      message: errorMessage
    });
  }
}

export async function consumeTelegramPhotoBatch(batch, env) {
  for (const message of batch.messages) {
    await processTelegramMessage(message, env);
  }
}
