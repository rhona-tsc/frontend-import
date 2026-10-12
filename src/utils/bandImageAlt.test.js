import test from 'node:test';
import assert from 'node:assert/strict';
import { bandImageDescriptions } from '../data/bandImageDescriptions.js';
import { getBandImageAlt } from './bandImageAlt.js';

const [url, description] = Object.entries(bandImageDescriptions)[0];
test('reviewed photo descriptions follow the source, not gallery position', () => {
  assert.equal(getBandImageAlt({ url }, {}, 0), description);
  assert.equal(getBandImageAlt({ url }, {}, 15), description);
});
test('Cloudinary resized versions retain the source description', () => {
  assert.equal(getBandImageAlt(url.replace('/upload/', '/upload/f_auto,q_auto,w_1200/')), description);
  assert.equal(getBandImageAlt(`${url}?example=1`), description);
});
test('explicitly authored descriptions take precedence', () => {
  assert.equal(getBandImageAlt({ url, alt: ' Custom description ' }), 'Custom description');
});
test('new images get a truthful fallback, never another image description', () => {
  assert.equal(getBandImageAlt({ url: 'https://example.com/new.jpg' }, { tscName: 'Example Band' }, 3), 'Example Band — band photograph 4');
});
test('all reviewed descriptions are concise, non-empty and band-specific', () => {
  assert.equal(Object.keys(bandImageDescriptions).length, 283);
  for (const [imageUrl, text] of Object.entries(bandImageDescriptions)) {
    assert.ok(imageUrl.startsWith('https://res.cloudinary.com/'));
    assert.ok(text.includes(': '));
    assert.ok(text.length > 30 && text.length < 220);
  }
});
