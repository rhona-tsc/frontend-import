import test from 'node:test';
import assert from 'node:assert/strict';
import { createAttributionStore, landingTouch } from './marketingAttribution.js';
const consent = state => ['consent', 'update', { ad_storage: state, ad_user_data: state }];
function browser(search = '', saved = new Map()) {
  const operations = [];
  return { location: { pathname: '/acts/', search }, document: { referrer: '' }, dataLayer: [], operations,
    localStorage: { getItem: k => { operations.push('read'); return saved.get(k); }, setItem: (k,v) => { operations.push('write'); saved.set(k,v); }, removeItem: k => { operations.push('remove'); saved.delete(k); } } };
}
test('no marketing storage or identifiers before consent; explicit denial removes a saved attribution', () => {
  const win = browser('?gclid=click-123&ads_campaign_id=123');
  const store = createAttributionStore(win);
  assert.equal(store.get().lastTouch.channel, 'Google Ads');
  assert.equal(store.get().lastTouch.gclid, undefined);
  assert.deepEqual(win.operations, []);
  win.dataLayer.push(consent('granted'));
  assert.equal(store.get().lastTouch.gclid, 'click-123');
  win.dataLayer.push(consent('denied'));
  assert.equal(store.get().lastTouch.gclid, undefined);
  assert.equal(win.operations.at(-1), 'remove');
});
test('return visits and a Stripe return keep the marketing source; a new campaign updates only the latest touch', () => {
  let clock = Date.parse('2026-11-10T12:00:00Z'); const saved = new Map();
  const first = browser('?gclid=first-click&ads_campaign_id=123&utm_term=motown+wedding+band', saved);
  first.dataLayer.push(consent('granted'));
  const firstState = createAttributionStore(first, () => clock).get();
  clock += 86400000;
  const returning = browser('', saved); returning.document.referrer = 'https://checkout.stripe.com/c/pay/private';
  // The CMP has not resolved yet. Do not erase a previous consented source.
  const store = createAttributionStore(returning, () => clock); store.get();
  assert.deepEqual(returning.operations, []);
  returning.dataLayer.push(consent('granted'));
  assert.equal(store.get().lastTouch.gclid, 'first-click');
  returning.location.search = '?utm_source=google&utm_medium=cpc&ads_campaign_id=456&gclid=second-click';
  const next = store.get();
  assert.deepEqual(next.firstTouch, firstState.firstTouch);
  assert.equal(next.lastTouch.campaignId, '456');
  assert.equal(next.lastTouch.gclid, 'second-click');
  returning.location.search = '';
  assert.equal(store.get().lastTouch.gclid, 'second-click');
});
test('expired attribution is discarded and sensitive URL/referrer details are never captured', () => {
  let clock = Date.parse('2026-11-10T12:00:00Z'); const win = browser('?gclid=first-click');
  win.dataLayer.push(consent('granted')); const store = createAttributionStore(win, () => clock); store.get();
  clock += 91 * 86400000; win.location.search = ''; win.location.pathname = '/booking/private-customer';
  win.document.referrer = 'https://example.com/customer?email=private@example.com';
  const next = createAttributionStore(win, () => clock).get();
  assert.equal(next.firstTouch.channel, 'Referral'); assert.equal(next.firstTouch.gclid, '');
  assert.equal(next.firstTouch.landingPath, ''); assert.equal(next.firstTouch.referrerHost, 'example.com');
  assert.doesNotMatch(JSON.stringify(next), /private|email|customer/);
  const bad = landingTouch(browser('?gclid=bad%40email.com&utm_term=private%40example.com'));
  assert.equal(bad.gclid, ''); assert.equal(bad.keyword, '');
});
test('the landing source survives SPA navigation before the CMP grants consent', () => {
  const win = browser('?gclid=landing-click&ads_campaign_id=123');
  win.document.referrer = 'https://www.google.com/';
  const store = createAttributionStore(win); store.get();
  win.location.pathname = '/act/funk-royale/'; win.location.search = '';
  win.dataLayer.push(consent('granted'));
  assert.equal(store.get().firstTouch.gclid, 'landing-click');
  assert.equal(store.get().lastTouch.campaignId, '123');
});
