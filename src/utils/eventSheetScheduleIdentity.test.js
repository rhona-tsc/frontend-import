import test from 'node:test';
import assert from 'node:assert/strict';
import {identifyScheduleRows} from './eventSheetScheduleIdentity.js';
test('imported rows have unique identities so editing notes affects one row only',()=>{
 const imported=[{activity:'Arrival',notes:'Setup'},{activity:'Doors',notes:'Open'}];
 const rows=identifyScheduleRows(imported,'booking');
 const edited=rows.map(r=>r.id===rows[0].id?{...r,notes:'New arrival note'}:r);
 assert.equal(edited[0].notes,'New arrival note');assert.equal(edited[1].notes,'Open');
 assert.deepEqual(identifyScheduleRows(rows,'booking'),rows);
 assert.deepEqual([edited[1],edited[0]].map(r=>r.notes),['Open','New arrival note']);
});
test('duplicate imported ids are repaired while existing valid ids survive',()=>{
 const rows=identifyScheduleRows([{id:'a'},{id:'a'},{id:'b'}],'booking');
 assert.equal(new Set(rows.map(r=>r.id)).size,3);assert.equal(rows[0].id,'a');assert.equal(rows[2].id,'b');
});
