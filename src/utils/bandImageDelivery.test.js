import test from 'node:test';
import assert from 'node:assert/strict';
import { bandImageDelivery, bandImageSrcSet } from './bandImageDelivery.js';
test('responsive delivery preserves original-pixel crop ordering', () => {
  const source = 'https://res.cloudinary.com/example/image/upload/c_crop,x_0,y_10,w_900,h_600/c_limit,w_960,f_auto,q_auto/v123/photo.jpg';
  const result = bandImageDelivery(source, 480);
  assert.ok(result.includes('/c_crop,x_0,y_10,w_900,h_600/c_limit,w_480,f_auto,q_auto/v123/'));
  assert.equal(bandImageSrcSet(source).split(', ').length, 3);
  assert.equal(bandImageDelivery('/assets/logo.png'), '/assets/logo.png');
  assert.equal(bandImageSrcSet('/assets/logo.png'), undefined);
});
