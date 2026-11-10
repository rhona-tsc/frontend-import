const STORAGE_KEY = 'tsc:marketing-attribution:v1';
const MAX_AGE = 90 * 24 * 60 * 60 * 1000;
const publicPath = /^\/(?:acts|act\/[a-z0-9-]+|wedding-bands-[a-z-]+|about|contact|blog(?:\/[a-z0-9-]+)?|venues)?\/?$/i;
const text = (value, max = 160) => {
  const clean = String(value || '').replace(/[\x00-\x1f\x7f<>]/g, '').trim();
  return clean.includes('@') ? '' : clean.slice(0, max);
};
const identifier = value => /^[a-zA-Z0-9_-]{1,512}$/.test(value || '') ? value : '';

export function advertisingConsent(dataLayer = []) {
  let storage = 'denied', userData = 'denied', decided = false;
  for (const command of dataLayer) {
    if (command?.[0] !== 'consent' || !['default', 'update'].includes(command[1])) continue;
    const values = command[2] || {};
    if (typeof values.ad_storage === 'string') storage = values.ad_storage;
    if (typeof values.ad_user_data === 'string') userData = values.ad_user_data;
    if (command[1] === 'update' && ('ad_storage' in values || 'ad_user_data' in values)) decided = true;
  }
  return { granted: storage === 'granted' && userData === 'granted', decided };
}

export function landingTouch(win, now = Date.now(), includeReferrer = true) {
  const params = new URLSearchParams(win.location.search || '');
  const gclid = identifier(params.get('gclid'));
  const gbraid = identifier(params.get('gbraid'));
  const wbraid = identifier(params.get('wbraid'));
  let source = text(params.get('utm_source')).toLowerCase();
  let medium = text(params.get('utm_medium')).toLowerCase();
  let referrerHost = '';
  try {
    const host = new URL(includeReferrer ? win.document?.referrer || '' : '').hostname.toLowerCase();
    if (!/(^|\.)(thesupremecollective\.co\.uk|stripe\.com|stripe\.network)$/.test(host)) referrerHost = host;
  } catch {}
  let channel;
  if (gclid || gbraid || wbraid || (source === 'google' && /^(cpc|ppc|paidsearch|paid_search)$/.test(medium))) {
    source = 'google'; medium = 'cpc'; channel = 'Google Ads';
  } else if (source) channel = 'Campaign';
  else if (/^(www\.)?google\.[a-z.]+$/.test(referrerHost)) {
    source = 'google'; medium = 'organic'; channel = 'Google organic';
  } else if (referrerHost) { source = referrerHost; medium = 'referral'; channel = 'Referral'; }
  else { source = '(direct)'; medium = '(none)'; channel = 'Direct / unknown'; }
  const touch = { channel, source, medium, capturedAt: new Date(now).toISOString(),
    landingPath: publicPath.test(win.location.pathname || '/') ? win.location.pathname || '/' : '', referrerHost };
  for (const [key, param] of Object.entries({ campaign: 'utm_campaign', content: 'utm_content', keyword: 'utm_term',
    campaignId: 'ads_campaign_id', adGroupId: 'ads_ad_group_id', adId: 'ads_creative_id',
    matchType: 'ads_match_type', network: 'ads_network', device: 'ads_device' })) touch[key] = text(params.get(param));
  return { ...touch, gclid, gbraid, wbraid };
}

export function createAttributionStore(win, now = Date.now) {
  let state, observedUrl, current, entryTouch;
  const coarse = touch => ({ channel: touch.channel, source: touch.source, medium: touch.medium, capturedAt: touch.capturedAt });
  return {
    get() {
      const clock = now();
      const url = `${win.location.pathname || '/'}${win.location.search || ''}`;
      if (url !== observedUrl) {
        current = landingTouch(win, clock, observedUrl === undefined); observedUrl = url;
        if (!entryTouch) entryTouch = current;
      }
      const consent = advertisingConsent(win.dataLayer);
      if (!consent.granted) {
        if (consent.decided) {
          state = undefined; entryTouch = undefined;
          try { win.localStorage.removeItem(STORAGE_KEY); } catch {}
        }
        return { version: 1, consentGranted: false, firstTouch: coarse(current), lastTouch: coarse(current) };
      }
      if (!state) {
        try { state = JSON.parse(win.localStorage.getItem(STORAGE_KEY)); } catch {}
      }
      const age = clock - new Date(state?.firstTouch?.capturedAt).getTime();
      if (!state?.firstTouch?.channel || !Number.isFinite(age) || age < 0 || age > MAX_AGE) state = undefined;
      if (!state) {
        const entryAge = clock - new Date(entryTouch?.capturedAt).getTime();
        const first = entryTouch && entryAge >= 0 && entryAge <= MAX_AGE ? entryTouch : current;
        state = { version: 1, consentGranted: true, firstTouch: first,
          lastTouch: current.channel === 'Direct / unknown' ? first : current };
      }
      else if (current.channel !== 'Direct / unknown' && new Date(current.capturedAt) > new Date(state.lastTouch?.capturedAt || 0)) {
        state.lastTouch = current;
      }
      state.consentGranted = true;
      try { win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
      return JSON.parse(JSON.stringify(state));
    },
  };
}

let store;
export function startMarketingAttribution(win = window) {
  if (store) return;
  store = createAttributionStore(win);
  store.get();
  const layer = win.dataLayer = win.dataLayer || [];
  const push = layer.push;
  layer.push = function (...commands) {
    const result = push.apply(this, commands);
    if (commands.some(command => command?.[0] === 'consent')) store.get();
    return result;
  };
}
export function getMarketingAttribution() {
  if (typeof window === 'undefined') return undefined;
  if (!store) startMarketingAttribution(window);
  return store.get();
}
