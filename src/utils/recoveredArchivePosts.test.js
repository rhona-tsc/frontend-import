import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recoveredArchivePosts, soundLimitersGuide, londonHotelsGuide, phoebeArchive } from '../data/recoveredArchivePosts.js';
import { blogPosts } from '../data/BlogPosts.js';
import { buildPageSchema } from './structuredData.js';

test('all three complete archive articles are registered with truthful provenance and schema', () => {
  for (const post of recoveredArchivePosts) {
    assert.ok(blogPosts.includes(post));
    assert.ok(post.content.length > 10);
    assert.match(JSON.stringify(post.content), /23 October 2026/);
    const schema = buildPageSchema({ route: '/blog/' + post.slug, title: post.title, post });
    assert.equal(schema['@graph'].find(n => n['@type'] === 'BlogPosting').author.name, 'Rhona Downie');
    assert.doesNotMatch(JSON.stringify(post), /subscription has expired|asset-library|\/config\//);
  }
  assert.equal(new Set(blogPosts.map(p => p.slug)).size, blogPosts.length);
});

test('dated historical URLs map directly to recovered matching articles including trailing slashes', () => {
  const redirects = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8');
  const records = redirects.split('\n').filter(l => l && !l.startsWith('#')).map(l => l.trim().split(/\s+/));
  for (const [date, post] of [['2025/4/4', soundLimitersGuide], ['2017/6/10', londonHotelsGuide], ['2017/5/25', phoebeArchive]]) {
    for (const suffix of ['', '/']) assert.ok(records.some(([from, to, status]) => from === `/journal/${date}/${post.slug}${suffix}` && to === `/blog/${post.slug}/` && status === '301!'));
  }
});

test('sound advice avoids unsupported universal limits and silent-stage promises', () => {
  const text = JSON.stringify(soundLimitersGuide);
  assert.doesNotMatch(text, /completely silent stage|most bands can perform comfortably|around 10%|92–98/);
  assert.match(text, /measurement weighting/);
  assert.match(text, /Do not move, cover or bypass/);
});

test('hotel list retains all ten original properties with rename evidence; diary remains historic', () => {
  assert.equal(londonHotelsGuide.content.filter(b => b.type === 'heading').length, 11);
  assert.match(JSON.stringify(londonHotelsGuide), /formerly Le Méridien/);
  assert.match(JSON.stringify(londonHotelsGuide), /formerly Radisson Blu/);
  assert.equal(londonHotelsGuide.publishedAt, '2017-06-11');
  const diary = JSON.stringify(phoebeArchive);
  assert.match(diary, /Phoebe x/);
  assert.match(diary, /not Eastington Park’s current policy/);
  assert.match(diary, /tlrtEawdygU/);
});
