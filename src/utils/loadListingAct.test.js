import test from 'node:test';
import assert from 'node:assert/strict';
import { createListingActLoader } from './loadListingAct.js';
test('pricing detail fetches are deduplicated and bounded, and failures can retry',async()=>{
 let active=0,max=0,calls=0;
 const load=createListingActLoader(async slug=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;return {slug};},2);
 const result=await Promise.all(['one','two','one','three','four'].map(load));
 assert.equal(calls,4);assert.equal(max,2);assert.equal(result[0],result[2]);
 let tries=0;const retry=createListingActLoader(async()=>{if(!tries++)throw Error('offline');return 'ok';});
 await assert.rejects(retry('band'),/offline/);assert.equal(await retry('band'),'ok');
 await assert.rejects(load('../private'),/slug/);
});
