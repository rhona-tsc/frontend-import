import test from 'node:test';
import assert from 'node:assert/strict';
import { blogPosts } from '../data/BlogPosts.js';
import { weddingBandSetlistGuide as post } from '../data/weddingBandSetlistGuide.js';

test('the wedding band setlist guide is published with the tracked repertoire keyword', () => {
  assert.equal(blogPosts[0], post);
  assert.equal(post.slug, 'can-you-choose-your-wedding-band-setlist');
  assert.equal(post.publishedAt, '2026-11-03');
  const opening = post.content.slice(0, 8).map(block => block.text || '').join(' ');
  assert.match(opening, /wedding band repertoire/i);
  assert.match(post.metaDescription, /wedding band’s setlist/i);
  assert.ok(post.content.some(block => block.links?.some(link => link.href === '/acts/')));
});
