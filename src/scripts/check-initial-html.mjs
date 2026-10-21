import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { renderLocationContent } = await import(pathToFileURL(path.resolve('node_modules/.cache/tsc-public-render/entry-public.mjs')).href);
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
const routes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
let checkedFonts = false;
for (const route of routes) {
  const html = await readFile(path.join('dist', route, 'index.html'), 'utf8');
  assert.match(html, /<div id="root" data-prerendered>/, `${route} must be visible without JavaScript`);
  assert.match(html, /data-initial-page-content=""/, `${route} must retain content while its route loads`);
  assert.doesNotMatch(html, /visibility:\s*hidden/, `${route} must not hide initial content`);
  assert.doesNotMatch(html, /\/src\/assets\//, `${route} must use published image paths`);
  const fonts = [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map(match => match[0]).filter(tag => tag.includes('as="font"'));
  assert.equal(fonts.length, route === '/' || route.startsWith('/wedding-bands-') ? 2 : 1, `${route} should only preload its critical fonts`);
  const cssPath = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/)[1];
  const css = await readFile(path.join('dist', cssPath), 'utf8');
  for (const font of fonts) {
    const file = font.match(/href="([^"]+)"/)[1];
    assert.ok(font.includes('crossorigin'));
    await access(path.join('dist', file));
    assert.ok(css.includes(path.basename(file)), 'Preload must use exactly the same font file as CSS');
  }
  if (!checkedFonts) {
    assert.doesNotMatch(css, /fonts\.googleapis\.com|fonts\.gstatic\.com|slick-slider|slick-theme/);
    assert.match(css, /font-display:swap/);
    await access('dist/font-licenses/outfit.txt');
    await access('dist/font-licenses/prata.txt');
    checkedFonts = true;
  }
  assert.equal((html.match(/id="initial-page-schema"/g) || []).length, 1, `${route} must retain one initial schema graph`);
  const schema = html.match(/<script id="initial-page-schema"[^>]*>(.*?)<\/script>/s);
  assert.ok(JSON.parse(schema[1])['@graph'].length);
  for (const asset of html.matchAll(/\bsrc="(\/assets\/[^"]+)"/g)) await access(path.join('dist', asset[1]));
  if (route.startsWith('/wedding-bands-')) {
    const data = JSON.parse(html.match(/<script id="initial-location-data"[^>]*>(.*?)<\/script>/s)[1]);
    const expected = renderLocationContent(route, route.replace('/wedding-bands-', ''), data);
    assert.ok(html.includes(`<div data-initial-page-content="">${expected}</div>`), `${route} must use the same county layout as React`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal((html.match(/<article\b/g) || []).length, Math.min(9, data.bands.length));
  }
}
console.log(`Verified visible initial content, schemas and published images on all ${routes.length} sitemap pages.`);
