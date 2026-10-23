import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blogPosts } from '../data/BlogPosts.js';

test('confirmed historical URLs redirect directly to the matching published page', () => {
  const source = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8');
  const mappings = new Map(source.split('\n').filter(l => l && !l.startsWith('#')).map(l => l.trim().split(/\s+/)).map(([from, to, status]) => [from, { to, status }]));
  const article = '/journal/2017/5/8/essential-stage-lighting-for-your-wedding-band';
  for (const suffix of ['', '/']) {
    assert.deepEqual(mappings.get(article + suffix), { to: '/blog/essential-stage-lighting-for-your-wedding-band/', status: '301!' });
    assert.deepEqual(mappings.get('/bandsforhire/themonstars' + suffix), { to: '/act/the-monstars/', status: '301!' });
  }
  assert.ok(blogPosts.some(p => p.slug === 'essential-stage-lighting-for-your-wedding-band'));
});

test('retired or add-on acts are not redirected to unrelated standalone bands', () => {
  const source = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8');
  for (const path of ['/bandsforhire/simcha-band', '/bandsforhire/the-horizons', '/bandsforhire/the-treasures', '/bandsforhire/dj-ewan']) {
    assert.ok(!source.split('\n').some(line => line.trim().split(/\s+/)[0] === path));
  }
});
