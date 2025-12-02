export const BACKEND =
  (import.meta.env.VITE_BACKEND_URL || "https://tsc-backend-v2.onrender.com").replace(/\/+$/,"");
// Centralised backend base + URL helper for API/SSE calls
// Behaviour:
//  • In DEV: if VITE_BACKEND_URL is set, use it; otherwise return relative paths so Vite proxy can forward to the backend.
//  • In PROD: use VITE_BACKEND_URL if set, else fall back to the Render URL.

const isDev = import.meta.env.DEV === true;

const explicit = (import.meta.env.VITE_BACKEND_URL || import.meta.env.BACKEND_URL || "").trim();
const fallbackProd = "https://tsc-backend-v2.onrender.com";

export const BACKEND = (explicit || (!isDev ? fallbackProd : "")).replace(/\/+$/ , "");

/** Build an API URL. If BACKEND is empty (dev with no env), return a relative path for Vite proxy. */
export const api = (path = "") => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return BACKEND ? `${BACKEND}${p}` : p;
};

// Small debug helper so you can quickly confirm which base is being used
export const logApiBase = () => {
  const mode = isDev ? "DEV" : "PROD";
  // eslint-disable-next-line no-console
};