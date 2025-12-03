// src/utils/actCache.js
const K = (id) => `act:${id}:v2`;
const TTL = 1000 * 60 * 60 * 24; // 24h

export function readCachedAct(id){
  try {
    const raw = localStorage.getItem(K(id));
    if (!raw) return null;
    const { ts, act } = JSON.parse(raw);
    if (!act || Date.now() - ts > TTL) return null;
    return act;
  } catch { return null; }
}

export function writeCachedAct(id, act){
  try { localStorage.setItem(K(id), JSON.stringify({ ts: Date.now(), act })); } catch {}
}