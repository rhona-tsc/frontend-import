import test from 'node:test';
import assert from 'node:assert/strict';
import { trackBusinessConversion } from './businessConversions.js';
import { matchVocalistChoices, restoreVocalistPicks, pickVocalist } from './vocalistChoices.js';
function browser(hostname = 'thesupremecollective.co.uk') {
  const calls = []; const stored = new Map();
  return { calls, location: { hostname }, gtag: (...args) => calls.push(args),
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) } };
}
test('only successful business receipts count, once across refreshes, with explicit Ads destinations', () => {
  const win = browser();
  for (const receipt of [null, {}, { kind: 'shortlist', id: 'shortlist:1' }, { kind: 'chat_start', id: 'chat:1' }, { kind: 'booking', id: 'booking:1', value: 0, currency: 'GBP' }]) assert.equal(trackBusinessConversion(receipt, win), false);
  const receipt = { kind: 'enquiry', id: 'enquiry:opaque-receipt' };
  assert.equal(trackBusinessConversion(receipt, win), true);
  assert.equal(trackBusinessConversion(receipt, win), false);
  assert.deepEqual(win.calls, [['event', 'conversion', { send_to: 'AW-17648722186/oq9lCMmY0rUdEIrCyN9B', transaction_id: receipt.id }]]);
  assert.equal(trackBusinessConversion({ kind: 'booking', id: 'booking:opaque-booking', value: 800, currency: 'GBP', email: 'private@example.com', address: 'private venue' }, win), true);
  assert.doesNotMatch(JSON.stringify(win.calls), /private|email|address/);
});
test('local and deploy previews never emit live conversions; unavailable Google does not mark a receipt sent', () => {
  const receipt = { kind: 'enquiry', id: 'enquiry:test' };
  for (const host of ['localhost', '127.0.0.1', 'preview.netlify.app', 'admin.thesupremecollective.co.uk']) {
    const win = browser(host); assert.equal(trackBusinessConversion(receipt, win), false); assert.equal(win.calls.length, 0);
  }
  const win = browser(); delete win.gtag;
  assert.equal(trackBusinessConversion(receipt, win), false);
  win.gtag = (...args) => win.calls.push(args);
  assert.equal(trackBusinessConversion(receipt, win), true);
});
const roles = [{ slotIndex: 0, candidates: [{ musicianId: 'alex' }, { musicianId: 'beth' }] }, { slotIndex: 1, candidates: [{ musicianId: 'alex' }, { musicianId: 'chris' }] }];
test('checkout requires one distinct confirmed singer per role and rejects unknown, duplicate or missing choices', () => {
  for (const ids of [[], ['alex'], ['alex', 'alex'], ['alex', 'unknown'], ['alex', 'beth', 'chris']]) assert.equal(matchVocalistChoices(roles, ids), null);
  assert.equal(matchVocalistChoices(roles, ['alex', 'beth']).length, 2);
  assert.deepEqual(restoreVocalistPicks(roles, ['alex', 'beth']), { 0: 'beth', 1: 'alex' });
  assert.deepEqual(pickVocalist({ 0: 'alex', 1: 'chris' }, 1, 'alex'), { 1: 'alex' });
  assert.equal(matchVocalistChoices([], []).length, 0);
});

test('usual singers are included automatically without surfacing unnecessary deputy alternatives', async () => {
  const { preferUsualVocalists, initialVocalistPicks } = await import('./vocalistChoices.js');
  const preferred = preferUsualVocalists([{ slotIndex: 0, candidates: [{ musicianId: 'usual', isDeputy: false }, { musicianId: 'deputy', isDeputy: true }] }, roles[1]]);
  assert.deepEqual(preferred[0].candidates.map(person => person.musicianId), ['usual']);
  assert.deepEqual(initialVocalistPicks(preferred), { 0: 'usual' });
  const overlapping = [{ slotIndex: 0, candidates: [{ musicianId: 'a', isDeputy: false }, { musicianId: 'b', isDeputy: true }] }, { slotIndex: 1, candidates: [{ musicianId: 'a', isDeputy: true }] }];
  assert.equal(preferUsualVocalists(overlapping)[0].candidates.length, 2);
});
