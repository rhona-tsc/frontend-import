// Never send a session token to a third-party URL or an unrelated API.
export function attachProtectedRequestToken(config, backendUrl, getToken) {
  let target;
  let backend;
  try {
    backend = new URL(backendUrl);
    target = new URL(config.url, config.baseURL || backend.href);
  } catch { return config; }
  if (target.origin !== backend.origin ||
      !/^\/(?:api\/(?:finance|upload|admin|debug)|debug)(?:\/|$)/.test(target.pathname)) return config;
  const headers = config.headers || {};
  const present = typeof headers.has === "function"
    ? headers.has("Authorization") || headers.has("token")
    : Object.keys(headers).some(key => /^(authorization|token)$/i.test(key));
  const token = present ? "" : getToken();
  if (token) {
    if (typeof headers.set === "function") headers.set("Authorization", `Bearer ${token}`);
    else headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }
  return config;
}
