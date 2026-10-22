import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script id="google-consent-defaults">([\s\S]*?)<\/script>/)[1];
const loader = readFileSync(new URL('../../public/google-tag-loader.js', import.meta.url), 'utf8');
function browser({ idle = true, readyState = 'loading' } = {}) {
  const nodes = [], frames = [], timers = [], idles = [], listeners = {};
  const window = {
    addEventListener(name, fn) { listeners[name] = fn; },
    requestAnimationFrame(fn) { frames.push(fn); },
    setTimeout(fn, delay) { timers.push({ fn, delay }); },
    ...(idle ? { requestIdleCallback(fn, options) { idles.push({ fn, options }); } } : {}),
  };
  const document = {
    readyState,
    head: { appendChild(node) { nodes.push(node); } },
    createElement() { return {}; },
    getElementById(id) { return nodes.find(node => node.id === id); },
  };
  const context = vm.createContext({ window, document });
  // Browser globals refer to window properties.
  Object.defineProperty(context, 'dataLayer', { get: () => window.dataLayer });
  vm.runInContext(bootstrap, context);
  window.gtag = context.gtag;
  vm.runInContext(loader, context);
  return { context, window, nodes, frames, timers, idles, listeners };
}
function paint(env) { env.frames.shift()(); env.frames.shift()(); }

test('denied consent defaults precede both destination configs and the CMP', () => {
  const env = browser();
  const calls = env.window.dataLayer;
  assert.equal(calls[0][0], 'consent');
  assert.equal(calls[0][1], 'default');
  for (const key of ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']) {
    assert.equal(calls[0][2][key], 'denied');
  }
  assert.deepEqual(Array.from(calls).filter(c => c[0] === 'config').map(c => c[1]), ['G-YQK2NHLSQN', 'AW-17648722186']);
  assert.ok(html.indexOf('google-consent-defaults') < html.indexOf('id="usercentrics-cmp"'));
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/www\.googletagmanager/);
  assert.match(html, /<script defer src="\/google-tag-loader\.js"><\/script>/);
});
test('Google waits for load, two paint frames and idle; loads exactly once', () => {
  const env = browser();
  assert.equal(env.nodes.length, 0);
  env.listeners.load();
  paint(env);
  assert.equal(env.nodes.length, 0);
  assert.equal(env.idles[0].options.timeout, 1500);
  env.idles.shift().fn();
  env.timers.find(t => t.delay === 4000).fn();
  assert.equal(env.nodes.length, 1);
  assert.equal(env.frames.length, 0);
  assert.equal(env.nodes[0].async, true);
  assert.match(env.nodes[0].src, /id=AW-17648722186$/);
});
test('stalled resources and browsers without idle callbacks still drain the queue', () => {
  const env = browser({ idle: false });
  env.timers.find(t => t.delay === 4000).fn();
  paint(env);
  env.timers.find(t => t.delay === 0).fn();
  assert.equal(env.nodes.length, 1);
});
test('accepted, rejected and revoked CMP updates and early events are retained in order', () => {
  const env = browser({ readyState: 'complete' });
  env.window.gtag('event', 'searchbox_submit_success', { test_only: true });
  for (const state of ['denied', 'granted', 'denied']) {
    env.window.gtag('consent', 'update', { analytics_storage: state, ad_storage: state, ad_user_data: state, ad_personalization: state });
  }
  const before = env.window.dataLayer;
  paint(env);
  env.idles.shift().fn();
  assert.equal(env.window.dataLayer, before);
  assert.equal(before[4][1], 'searchbox_submit_success');
  assert.deepEqual(Array.from(before).filter(c => c[1] === 'update').map(c => c[2].analytics_storage), ['denied', 'granted', 'denied']);
  assert.equal(before.filter(c => c[1] === 'default').length, 1);
});
