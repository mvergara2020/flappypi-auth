import worker from "./worker.js";

const LOCAL_FRONTEND_HOST = "192.168.1.81";
const LOCAL_FRONTEND_PORT = "3000";

function rewriteLocalFrontendLocation(value, env) {
  if (String(env?.ENV || "").toLowerCase() !== "dev" || !value) return value;

  try {
    const url = new URL(value);

    if (
      url.protocol === "http:" &&
      url.hostname === LOCAL_FRONTEND_HOST &&
      url.port === LOCAL_FRONTEND_PORT
    ) {
      url.protocol = "https:";
      return url.href;
    }
  } catch (_) {}

  return value;
}

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const location = response.headers.get("Location");
    const rewrittenLocation = rewriteLocalFrontendLocation(location, env);

    if (!location || rewrittenLocation === location) return response;

    const headers = new Headers(response.headers);
    headers.set("Location", rewrittenLocation);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
