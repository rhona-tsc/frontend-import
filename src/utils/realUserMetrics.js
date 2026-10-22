import { PUBLIC_ORIGIN, publicCanonicalUrl } from './publicUrls.js';

export const METRICS_DESTINATION = 'G-YQK2NHLSQN';
const publicPage = /^\/(?:acts|about|contact|blog|venues|wedding-bands-[a-z-]+|act\/[a-z0-9-]+|blog\/[a-z0-9-]+)?\/?$/;

export function metricsPage(pathname) {
  return typeof pathname === 'string' && publicPage.test(pathname)
    ? publicCanonicalUrl(pathname).slice(PUBLIC_ORIGIN.length) : null;
}

// Read the actual Consent Mode commands, not the user's click on a CMP button:
// saving preferences does not necessarily grant analytics permission.
export function analyticsGranted(dataLayer = []) {
  let state = 'denied';
  for (const command of dataLayer) {
    if (command?.[0] === 'consent' && ['default', 'update'].includes(command[1]) &&
        typeof command[2]?.analytics_storage === 'string') {
      state = command[2].analytics_storage;
    }
  }
  return state === 'granted';
}

export function createMetricsReporter({ page, consent, currentPath, send }) {
  const sent = new Set();
  return (metric) => {
    if (!page || metricsPage(currentPath()) !== page || !consent() ||
        !['LCP', 'FCP', 'TTFB'].includes(metric.name) ||
        !Number.isFinite(metric.value) || metric.value < 0) return false;
    const key = `${metric.name}:${metric.id}`;
    if (sent.has(key)) return false;
    // No element text, query strings, venue, email or persistent identifiers.
    send('event', 'site_performance', {
      send_to: METRICS_DESTINATION,
      metric_name: metric.name,
      metric_value: Math.round(metric.value),
      metric_rating: metric.rating,
      metric_id: metric.id,
      navigation_type: metric.navigationType,
      performance_version: 'initial-load-v1',
      page_path: page,
      page_location: PUBLIC_ORIGIN + page,
      page_title: 'Public website performance',
      page_referrer: '',
      non_interaction: true,
      transport_type: 'beacon',
    });
    sent.add(key);
    return true;
  };
}

export function installRealUserMetrics(win, doc, loadVitals = () => import('web-vitals')) {
  const page = metricsPage(win.location.pathname);
  // Local previews and staging must never pollute the live analytics property.
  if (!page || win.location.origin !== PUBLIC_ORIGIN) return;
  let started = false;
  let timer;
  const consent = () => analyticsGranted(win.dataLayer);
  const check = () => {
    if (started || doc.readyState !== 'complete' || doc.visibilityState === 'hidden' ||
        metricsPage(win.location.pathname) !== page || !consent() || typeof win.gtag !== 'function') return;
    started = true;
    win.clearInterval(timer);
    win.removeEventListener('UC_UI_INITIALIZED', check);
    win.removeEventListener('UC_UI_CMP_EVENT', onConsentEvent);
    win.removeEventListener('load', check);
    doc.removeEventListener('visibilitychange', check);
    // Buffered browser entries retain the original navigation timings even when
    // consent and this tiny separate module arrive after first paint.
    loadVitals().then(({ onLCP, onFCP, onTTFB }) => {
      if (!consent()) return;
      const report = createMetricsReporter({
        page, consent, currentPath: () => win.location.pathname,
        send: (...args) => win.gtag(...args),
      });
      onLCP(report);
      onFCP(report);
      onTTFB(report);
    }).catch(() => { /* Measurement must never interrupt a booking journey. */ });
  };
  const onConsentEvent = () => win.setTimeout(check, 0);
  win.addEventListener('UC_UI_INITIALIZED', check);
  win.addEventListener('UC_UI_CMP_EVENT', onConsentEvent);
  win.addEventListener('load', check, { once: true });
  doc.addEventListener('visibilitychange', check);
  // CMP event delivery can precede its consent command. Recheck without
  // intercepting dataLayer.push or altering existing Analytics/Ads behaviour.
  timer = win.setInterval(check, 2000);
  check();
}
