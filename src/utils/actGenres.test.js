import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesActGenres } from './actGenres.js';

test('genre fallback excludes unrelated and unclassified cards when server search fails', () => {
  const cards = [
    { name: 'Motown Luxe', genres: ['Soul & Motown'] },
    { name: 'Garage act', genres: ['RnB, HipHop & Garage'] },
    { name: 'Unknown act', genres: [] },
    { name: 'Band Salsa', genres: [] },
  ];
  assert.deepEqual(cards.filter(card => matchesActGenres(card, ['Soul & Motown']))
    .map(card => card.name), ['Motown Luxe']);
  assert.equal(matchesActGenres(cards[2], []), true);
});

test('legacy and nested genre values normalize and full acts retain card metadata', () => {
  assert.equal(matchesActGenres({ genre: [['Soul and Motown']] }, ['Soul & Motown']), true);
  assert.equal(matchesActGenres({ genres: [], __card: { genres_norm: ['soul and motown'] } }, ['Soul & Motown']), true);
});

test('published soul selections fill missing metadata without guessing from an act name', () => {
  assert.equal(matchesActGenres({ name: 'Funk Royale', genres: [] }, ['Soul & Motown']), true);
  assert.equal(matchesActGenres({ slug: 'soul-eras', genres: [] }, ['Soul & Motown']), true);
  assert.equal(matchesActGenres({ name: 'Soul tribute unknown', genres: [] }, ['Soul & Motown']), false);
  assert.equal(matchesActGenres({ name: 'Funk Royale', genres: ['Latin'] }, ['Soul & Motown']), false);
});
