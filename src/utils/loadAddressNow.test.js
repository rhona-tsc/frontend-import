import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAddressNowLoader } from './loadAddressNow.js';

function browser() {
  const nodes = [];
  const window = {};
  const document = {
    head: { appendChild(node) { nodes.push(node); } },
    createElement(tag) {
      return { tag, dataset: {}, remove() { nodes.splice(nodes.indexOf(this), 1); } };
    },
  };
  return { nodes, window, document };
}
const readyPca = () => ({ Address() {}, fieldMode: { SEARCH: 1, POPULATE: 2 } });

test('initial HTML contains no blocking address lookup assets', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /api\.addressnow\.co\.uk/);
});

test('loads one async script and one stylesheet on demand, sharing concurrent requests', async () => {
  const env = browser();
  const load = createAddressNowLoader(env);
  assert.equal(env.nodes.length, 0);
  const first = load();
  assert.equal(load(), first);
  assert.equal(env.nodes.length, 2);
  assert.equal(env.nodes.find(n => n.tag === 'script').async, true);
  env.window.pca = readyPca();
  env.nodes.find(n => n.tag === 'link').onload();
  assert.equal(await first, env.window.pca);
  assert.equal(await load(), env.window.pca);
  assert.equal(env.nodes.length, 2);
});

test('waits for stylesheet as well as script before binding suggestions', async () => {
  const env = browser();
  env.window.pca = readyPca();
  const load = createAddressNowLoader(env);
  const pending = load();
  assert.equal(env.nodes.length, 1, 'An existing API must not be downloaded again');
  let resolved = false;
  pending.then(() => { resolved = true; });
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(resolved, false);
  env.nodes[0].onload();
  await pending;
});

test('failed downloads can be retried without duplicate assets', async () => {
  const env = browser();
  const load = createAddressNowLoader(env);
  const failed = load();
  env.nodes.find(n => n.tag === 'script').onerror();
  await assert.rejects(failed, /full UK postcode/);
  assert.equal(env.nodes.length, 0);
  const retry = load();
  env.window.pca = readyPca();
  env.nodes.find(n => n.tag === 'link').onload();
  assert.equal(await retry, env.window.pca);
  assert.equal(env.nodes.length, 2);
});

test('stalled downloads time out and can be retried', async () => {
  const env = browser();
  const load = createAddressNowLoader({ ...env, timeoutMs: 20 });
  await assert.rejects(load(), /full UK postcode/);
  assert.equal(env.nodes.length, 0);
});
