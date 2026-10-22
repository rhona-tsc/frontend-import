import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsGranted, metricsPage, createMetricsReporter, installRealUserMetrics } from './realUserMetrics.js';

test('only public pages are measured, never queries or private profiles', () => {
  assert.equal(metricsPage('/wedding-bands-essex/'), '/wedding-bands-essex/');
  assert.equal(metricsPage('/act/soul-allegiance'), '/act/soul-allegiance/');
  assert.equal(metricsPage('/'), '/');
  for (const path of ['/cart', '/client-dashboard', '/musician/rick-f', '/event-sheet/123', '/acts?email=x', '/act/a%40b']) {
    assert.equal(metricsPage(path), null);
  }
});
test('permission starts denied and follows explicit Consent Mode updates', () => {
  const commands = [];
  assert.equal(analyticsGranted(commands), false);
  commands.push(['consent', 'default', { analytics_storage: 'denied' }]);
  commands.push(['event', 'ACCEPT_ALL']);
  assert.equal(analyticsGranted(commands), false);
  commands.push(['consent', 'update', { analytics_storage: 'granted' }]);
  assert.equal(analyticsGranted(commands), true);
  commands.push(['consent', 'update', { ad_storage: 'denied' }]);
  assert.equal(analyticsGranted(commands), true);
  commands.push(['consent', 'update', { analytics_storage: 'denied' }]);
  assert.equal(analyticsGranted(commands), false);
});
test('reporter sanitises context, targets GA4 only and deduplicates metrics', () => {
  const events = [];
  let granted = false;
  let path = '/acts/';
  const report = createMetricsReporter({ page: path, consent: () => granted, currentPath: () => path, send: (...args) => events.push(args) });
  const metric = { name: 'LCP', value: 926.3, id: 'navigation-one', rating: 'good', navigationType: 'navigate', entries: [{ private: 'not sent' }] };
  assert.equal(report(metric), false);
  granted = true;
  assert.equal(report(metric), true);
  assert.equal(report(metric), false);
  assert.equal(events.length, 1);
  assert.equal(events[0][2].send_to, 'G-YQK2NHLSQN');
  assert.equal(events[0][2].metric_value, 926);
  assert.equal(events[0][2].page_location, 'https://thesupremecollective.co.uk/acts/');
  assert.equal(events[0][2].page_referrer, '');
  assert.equal(JSON.stringify(events).includes('not sent'), false);
  granted = false;
  assert.equal(report({ ...metric, id: 'two' }), false);
  granted = true;
  path = '/client-dashboard';
  assert.equal(report({ ...metric, id: 'two' }), false);
});
test('invalid values and unrelated metrics are rejected', () => {
  const report = createMetricsReporter({ page: '/', consent: () => true, currentPath: () => '/', send: () => assert.fail() });
  for (const metric of [{ name: 'LCP', value: NaN }, { name: 'LCP', value: -1 }, { name: 'unknown', value: 1 }]) assert.equal(report(metric), false);
});
test('observers lazy-load once, only after load and consent, with revocation respected', async () => {
  const listeners = new Map();
  const events = [];
  let checks;
  let loads = 0;
  const callbacks = [];
  const win = {
    location: { origin: 'https://thesupremecollective.co.uk', pathname: '/acts/' },
    dataLayer: [], gtag: (...args) => events.push(args),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
    setInterval: (fn) => { checks = fn; return 1; }, clearInterval: () => {}, setTimeout: (fn) => fn(),
  };
  const doc = { readyState: 'loading', visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  installRealUserMetrics(win, doc, async () => {
    loads++;
    return { onLCP: (fn) => callbacks.push(fn), onFCP: (fn) => callbacks.push(fn), onTTFB: (fn) => callbacks.push(fn) };
  });
  checks();
  assert.equal(loads, 0);
  doc.readyState = 'complete';
  checks();
  assert.equal(loads, 0);
  win.dataLayer.push(['consent', 'update', { analytics_storage: 'granted' }]);
  checks(); checks();
  await Promise.resolve();
  assert.equal(loads, 1);
  assert.equal(callbacks.length, 3);
  win.dataLayer.push(['consent', 'update', { analytics_storage: 'denied' }]);
  callbacks[0]({ name: 'LCP', value: 900, id: 'one' });
  assert.equal(events.length, 0);
});
