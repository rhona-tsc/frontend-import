import test from 'node:test';
import assert from 'node:assert/strict';
import { publicActRedirects } from './publicRouteRules.js';
test('known old names and IDs redirect directly; ambiguous aliases and unknown routes do not',()=>{
 const rules=publicActRedirects([{_id:'abc123',name:'Motown Magic',tscName:'Dancefloor Magic',slug:'dancefloor-magic'},{name:'All Nighters',slug:'all-nighters'}]);
 assert.match(rules,/\/act\/motown-magic \/act\/dancefloor-magic\/ 301!/);
 assert.match(rules,/\/bandsforhire\/rhythm-mystique \/act\/dancefloor-magic\/ 301!/);
 assert.match(rules,/\/act\/abc123 \/act\/dancefloor-magic\/ 301!/);
 assert.doesNotMatch(rules,/\/act\/hot-rox/);
 assert.doesNotMatch(rules,/\/act\/dancefloor-magic \/act\/dancefloor-magic\//);
 assert.doesNotMatch(rules,/\*/);
});
