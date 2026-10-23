import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanVenueName } from './venueName.js';

test('cleans imported venue names and applies proper case', () => {
  assert.equal(cleanVenueName('For the address we have: Houchins Wedding Venue'), 'Houchins Wedding Venue');
  assert.equal(cleanVenueName('  FOR THE ADDRESS WE HAVE :  Example Hall  '), 'Example Hall');
  assert.equal(cleanVenueName('Braxted Park Estate'), 'Braxted Park Estate');
  assert.equal(cleanVenueName('THE OLD HALL'), 'The Old Hall');
  assert.equal(cleanVenueName('the old hall'), 'The Old Hall');
  assert.equal(cleanVenueName("ST MARY'S-ON-THE-HILL"), "St Mary's-On-The-Hill");
  assert.equal(cleanVenueName('RAF CLUB LONDON'), 'RAF Club London');
  assert.equal(cleanVenueName('O2 ACADEMY'), 'O2 Academy');
  assert.equal(cleanVenueName('McDonald Manor'), 'McDonald Manor');
  assert.equal(cleanVenueName('For the address we have: Houchins Wedding Venue, Houchin’s Ln, Colchester CO6 1RT'), 'Houchins Wedding Venue, Houchin’s Ln, Colchester CO6 1RT');
  assert.equal(cleanVenueName('Hall: For the address we have: annex'), 'Hall: For the Address We Have: Annex');
  assert.equal(cleanVenueName(null), '');
});
