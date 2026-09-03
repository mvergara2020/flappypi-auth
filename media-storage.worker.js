const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

function safeSegment(value, fallback = "unknown") {
  const segment = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 120);
  return segment || fallback;
}

function storagePrefix(env) {
  const environment = String(env?.ENV || "dev").trim().toLowerCase();
  if (["qa", "test", "testing", "testnet"].includes(environment)) return "qa";
  if (["prod", "production", "main", "mainnet"].includes(environment)) return "prod";
  return "dev";
}

export function imageExtensionForContentType(contentType) {
  return IMAGE_EXTENSIONS.get(String(contentType || "").split(";", 1)[0].trim().toLowerCase()) || "";
}

export function imageContentTypeForExtension(extension) {
  return [...IMAGE_EXTENSIONS.entries()].find(([, value]) => value === String(extension || "").toLowerCase())?.[0] || "";
}

export function imageMatchesSignature(bytes, contentType) {
  const data = new Uint8Array(bytes);
  const type = String(contentType || "").toLowerCase();
  if (type === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (type === "image/png") return data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 && data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a;
  if (type === "image/webp") return data.length >= 12 && String.fromCharCode(...data.slice(0, 4)) === "RIFF" && String.fromCharCode(...data.slice(8, 12)) === "WEBP";
  return false;
}

export function buildGameImageKey(env, { gameType, userId, photoId, extension, createdAt = Date.now() }) {
  const date = new Date(createdAt);
  const year = Number.isNaN(date.getTime()) ? "1970" : String(date.getUTCFullYear());
  const month = Number.isNaN(date.getTime()) ? "01" : String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${storagePrefix(env)}/${safeSegment(gameType, "game")}/${safeSegment(userId)}/${year}/${month}/${safeSegment(photoId)}.${safeSegment(extension, "bin")}`;
}

export function imageBucketForKey(env, storageKey) {
  const key = String(storageKey || "");
  if (key.startsWith("qa/")) return env?.IMAGES_BUCKET || null;
  return env?.GAME_PHOTOS || null;
}

export async function getStoredImage(env, storageKey) {
  const bucket = imageBucketForKey(env, storageKey);
  if (!bucket || typeof bucket.get !== "function") return null;
  return bucket.get(storageKey);
}

export async function deleteStoredImage(env, storageKey) {
  const bucket = imageBucketForKey(env, storageKey);
  if (!bucket || typeof bucket.delete !== "function") throw new Error("IMAGE_STORAGE_NOT_CONFIGURED");
  return bucket.delete(storageKey);
}

export async function putStoredImage(env, storageKey, bytes, contentType, metadata = {}) {
  const bucket = imageBucketForKey(env, storageKey);
  if (!bucket || typeof bucket.put !== "function") throw new Error("IMAGE_STORAGE_NOT_CONFIGURED");
  return bucket.put(storageKey, bytes, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: metadata
  });
}

export { IMAGE_EXTENSIONS, MAX_IMAGE_BYTES };
