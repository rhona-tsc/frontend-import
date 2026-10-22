export const isChunkLoadError = error => /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|Unable to preload CSS/i.test(String(error?.message || error || ''));
const publicPage = /^\/(?:acts(?:\/(?:london|essex|kent))?|act\/[^/]+|blog(?:\/[^/]+)?|wedding-bands-[a-z-]+|about|contact|venues|terms|privacy)?\/?$/;

// A missing old release chunk needs fresh HTML, not repeated imports of the same
// URL. Keep one retry across reloads; never interrupt private forms or loop.
export function recoverChunkLoad(error, { location, storage, online = true, now = Date.now() } = {}) {
  if (!isChunkLoadError(error) || !online || !location || !publicPage.test(location.pathname)) return false;
  try {
    if (!storage) return false;
    const key = 'tsc:chunk-recovery';
    const previous = Number(storage.getItem(key));
    if (previous > 0 && now - previous < 300000) return false;
    storage.setItem(key, String(now));
    if (storage.getItem(key) !== String(now)) return false;
    location.reload(); // Retains the exact requested path, query and fragment.
    return true;
  } catch { return false; }
}

export function recoverBrowserChunk(error) {
  if (typeof window === 'undefined') return false;
  try { return recoverChunkLoad(error, { location: window.location, storage: window.sessionStorage, online: window.navigator.onLine !== false }); }
  catch { return false; }
}
