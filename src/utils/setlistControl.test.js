import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SETLIST_CONTROL_LABELS,
  SETLIST_CONTROL_OPTIONS,
  matchesSetlistControl,
} from './setlistControl.js';

test('setlist-control options use the same three levels shown on act profiles', () => {
  assert.deepEqual(SETLIST_CONTROL_OPTIONS, [
    { value: 'smallTailoring', label: 'Signature Setlist' },
    { value: 'mediumTailoring', label: 'Collaborative Setlist' },
    { value: 'largeTailoring', label: 'Fully Tailored Setlist' },
  ]);
  assert.equal(SETLIST_CONTROL_LABELS.largeTailoring, 'Fully Tailored Setlist');
});

test('setlist-control matching uses OR logic across selected levels', () => {
  assert.equal(matchesSetlistControl({ setlist: 'smallTailoring' }, []), true);
  assert.equal(
    matchesSetlistControl(
      { setlist: 'mediumTailoring' },
      ['mediumTailoring', 'largeTailoring'],
    ),
    true,
  );
  assert.equal(
    matchesSetlistControl(
      { __card: { setlist: 'smallTailoring' } },
      ['largeTailoring'],
    ),
    false,
  );
});
