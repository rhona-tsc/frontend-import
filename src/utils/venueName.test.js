import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanVenueName } from './venueName.js';

test('removes the imported address prefix without changing the venue name', () => {
  assert.equal(cleanVenueName('For the address we have: Houchins Wedding Venue'), 'Houchins Wedding Venue');
  assert.equal(cleanVenueName('  FOR THE ADDRESS WE HAVE :  Example Hall  '), 'Example Hall');
  assert.equal(cleanVenueName('Braxted Park Estate'), 'Braxted Park Estate');
  assert.equal(cleanVenueName('For the address we have: Houchins Wedding Venue, Houchin’s Ln, Colchester CO6 1RT'), 'Houchins Wedding Venue, Houchin’s Ln, Colchester CO6 1RT');
  assert.equal(cleanVenueName('Hall: For the address we have: annex'), 'Hall: For the address we have: annex');
  assert.equal(cleanVenueName(null), '');
});
