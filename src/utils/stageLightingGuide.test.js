import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { stageLightingGuide as post } from '../data/stageLightingGuide.js';
import { blogPosts } from '../data/BlogPosts.js';
import { jenAndTomWedding } from '../data/jenAndTomWedding.js';
import { buildPageSchema } from './structuredData.js';

test('lighting recovery preserves provenance without universal equipment promises or dead embeds', () => {
  assert.ok(blogPosts.includes(post));
  assert.equal(post.publishedAt, '2017-05-08');
  assert.equal(post.author, 'Rhona Downie');
  assert.match(JSON.stringify(post.content), /refreshed on 22 October 2026/);
  assert.match(JSON.stringify(post.content), /not a promise that every band/);
  assert.doesNotMatch(JSON.stringify(post), /we always bring|we bring an LED|iframe|video isn.t available|subscription has expired/i);
  const images = [{ src: post.heroImage, alt: post.heroImageAlt, width: post.heroImageWidth, height: post.heroImageHeight }, ...post.content.filter(b => b.type === 'image')];
  for (const image of images) {
    assert.ok(image.alt && image.width && image.height);
    assert.ok(existsSync(new URL('../../public' + image.src, import.meta.url)));
  }
  const article = buildPageSchema({ route: '/blog/' + post.slug, title: post.title, post })['@graph'].find(n => n['@type'] === 'BlogPosting');
  assert.equal(article.author['@type'], 'Person');
  assert.equal(article.headline, post.title);
});

test('lighting guide and real wedding link both ways, with a direct legacy fallback redirect', () => {
  assert.ok(jenAndTomWedding.content.some(b => b.links?.some(l => l.href === `/blog/${post.slug}/`)));
  assert.ok(post.content.some(b => b.links?.some(l => l.href === '/blog/jen-and-toms-wedding/')));
  const redirects = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8');
  assert.match(redirects, /\/journal\/essential-stage-lighting-for-your-wedding-band\s+\/blog\/essential-stage-lighting-for-your-wedding-band\/\s+301!/);
  const slugs = blogPosts.map(p => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});
