const LOCAL_GUEST_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "192.168.1.81"]);
const LOCAL_PROTOCOLS = new Set(["http:", "https:"]);

function isLocalAuthHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return LOCAL_GUEST_HOSTS.has(host)
    || /^10\./.test(host)
    || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

export function isGuestLoginAllowedRequest(request, env) {
  if (String(env?.ENV || "").trim().toLowerCase() !== "dev") return false;

  const origin = String(request?.headers?.get("Origin") || "").trim();
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return LOCAL_PROTOCOLS.has(originUrl.protocol)
      && LOCAL_GUEST_HOSTS.has(originUrl.hostname.toLowerCase())
      && LOCAL_PROTOCOLS.has(requestUrl.protocol)
      && isLocalAuthHost(requestUrl.hostname);
  } catch (_) {
    return false;
  }
}
