export function createListingActLoader(fetchAct, concurrency = 4) {
  const pending = new Map(); const queue = []; let active = 0;
  const drain = () => {
    while (active < concurrency && queue.length) {
      const job = queue.shift(); active++;
      Promise.resolve().then(() => fetchAct(job.slug)).then(job.resolve, job.reject).finally(() => { active--; drain(); });
    }
  };
  return slug => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) return Promise.reject(new Error('Missing band slug'));
    if (!pending.has(slug)) {
      const work = new Promise((resolve,reject) => { queue.push({slug,resolve,reject}); drain(); })
        .catch(error => { pending.delete(slug); throw error; });
      pending.set(slug,work);
    }
    return pending.get(slug);
  };
}
export const loadListingAct = createListingActLoader(async slug => {
  const base = (import.meta.env?.VITE_BACKEND_URL || 'https://tsc-backend-v2.onrender.com').replace(/\/+$/, '');
  const response = await fetch(`${base}/api/act/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Band pricing details unavailable');
  const result = await response.json();
  if (!result.success || result.act?.slug !== slug || !result.act?.lineups?.length) throw new Error('Band pricing details missing');
  return result.act;
});
