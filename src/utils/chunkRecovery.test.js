import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverChunkLoad } from './chunkRecovery.js';
const error = new TypeError('Failed to fetch dynamically imported module: /assets/Act-old.js');
const setup = (pathname='/act/one-love/') => {
  const values = new Map(); let reloads = 0;
  return { options: { location: { pathname, reload: () => reloads++ }, storage: { getItem:k=>values.get(k), setItem:(k,v)=>values.set(k,v) }, now:1000000 }, reloads:()=>reloads };
};
test('one public chunk failure reloads the requested page exactly once across reloads', () => {
  const s=setup();
  assert.equal(recoverChunkLoad(error,s.options),true);
  assert.equal(recoverChunkLoad(error,s.options),false);
  assert.equal(s.reloads(),1);
  assert.equal(recoverChunkLoad(error,{...s.options,now:1300001}),true);
});
test('offline, ordinary errors, private forms and unavailable storage never auto-reload', () => {
  const s=setup();
  assert.equal(recoverChunkLoad(new Error('API failed'),s.options),false);
  assert.equal(recoverChunkLoad(error,{...s.options,online:false}),false);
  assert.equal(recoverChunkLoad(error,{...s.options,storage:{getItem(){throw Error('denied')}}}),false);
  assert.equal(recoverChunkLoad(error,{...s.options,storage:null}),false);
  for(const path of ['/event-sheet/123','/client-dashboard','/place-booking','/venues/claim/token','/cart']) assert.equal(recoverChunkLoad(error,setup(path).options),false);
  assert.equal(s.reloads(),0);
});
