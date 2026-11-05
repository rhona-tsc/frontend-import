import test from 'node:test';
import assert from 'node:assert/strict';
import { describeEventSheetLineup } from './eventSheetLineup.js';
const member = (instrument, extra = {}) => ({ instrument, isEssential: true, ...extra });

test('two booked lead female vocalists are counted instead of collapsed into one role', () => {
  const result = describeEventSheetLineup({ bandMembers: [member('Lead Female Vocal'), member('Lead Female Vocal'), member('Bass Guitar'), member('Keyboard'), member('Electric Guitar'), member('Drums')] });
  assert.equal(result, '2 × Lead Female Vocals, Bass Guitar, Keyboard, Electric Guitar & Drums');
});
test('repeated instruments retain counts, distinct vocal roles stay separate and optional parts are excluded', () => {
  const result = describeEventSheetLineup({ bandMembers: [member('Saxophone'), member('saxophone'), member('Lead Female Vocal'), member('Lead Male Vocal'), member('Trumpet', { isEssential: false })] });
  assert.equal(result, 'Lead Female Vocal, Lead Male Vocal & 2 × Saxophone');
});
test('essential shared services are listed once without adding a performer', () => {
  const service = { role: 'Sound Engineering', isEssential: true };
  const result = describeEventSheetLineup({ bandMembers: [member('Lead Female Vocal', { additionalRoles: [service] }), member(' lead  female vocal ', { additionalRoles: [service] }), member('', { additionalRoles: [{ role: 'Band Manager', isEssential: true }] })] });
  assert.equal(result, '2 × Lead Female Vocals (including Sound Engineering & Band Manager services)');
});
test('a solo vocalist stays singular and missing lineups have no invented parts', () => {
  assert.equal(describeEventSheetLineup({ bandMembers: [member('Lead Female Vocal')] }), 'Lead Female Vocal');
  assert.equal(describeEventSheetLineup(), ''); assert.equal(describeEventSheetLineup(null), '');
});
