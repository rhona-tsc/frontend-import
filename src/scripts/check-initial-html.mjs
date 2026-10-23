import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { publicCanonicalUrl, publicHref } from '../utils/publicUrls.js';

const { renderLocationContent } = await import(pathToFileURL(path.resolve('node_modules/.cache/tsc-public-render/entry-public.mjs')).href);
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
for (const url of sitemapUrls) assert.equal(publicHref(url), url, 'Sitemap must use final public URLs');
const routes = sitemapUrls.map(url => new URL(url).pathname.replace(/\/+$/, '') || '/');
let checkedFonts = false;
for (const route of routes) {
  const html = await readFile(path.join('dist', route, 'index.html'), 'utf8');
  assert.ok(html.includes(`rel="canonical" href="${publicCanonicalUrl(route)}"`), `${route} canonical must match the sitemap`);
  for (const match of html.matchAll(/href="([^"]+)"/g)) assert.equal(match[1], publicHref(match[1]), `${route} must link directly to public destinations`);
  assert.ok(html.indexOf('id="google-consent-defaults"') >= 0 && html.indexOf('id="google-consent-defaults"') < html.indexOf('id="usercentrics-cmp"'), `${route} must establish consent before the CMP`);
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/www\.googletagmanager/, `${route} must defer Google downloads`);
  assert.match(html, /<script defer src="\/google-tag-loader\.js"><\/script>/);
  await access('dist/google-tag-loader.js');
  assert.match(html, /<div id="root" data-prerendered(?: data-hydrate="county")?>/, `${route} must be visible without JavaScript`);
  assert.match(html, /data-initial-page-content=""/, `${route} must retain content while its route loads`);
  assert.doesNotMatch(html, /visibility:\s*hidden/, `${route} must not hide initial content`);
  assert.doesNotMatch(html, /initial-public-content/, `${route} must use its designed initial layout rather than generic SEO markup`);
  if (!route.startsWith('/wedding-bands-')) {
    assert.doesNotMatch(html, /aria-label="Breadcrumb"/, `${route} must not flash generic breadcrumbs before its page loads`);
  }
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
    const initialStyles = html.match(/<style id="initial-page-styles">([\s\S]*?)<\/style>/)?.[1];
    assert.ok(initialStyles && Buffer.byteLength(initialStyles) <= 24000, 'County initial styles must be inline and bounded');
    assert.match(initialStyles, /font-display:swap/);
    assert.doesNotMatch(html.replace(/<noscript>[\s\S]*?<\/noscript>/g, ''), /<link\b[^>]*rel="stylesheet"/);
    assert.match(html, /rel="preload" as="style"/);
    assert.ok(html.includes(`<noscript><link rel="stylesheet"`), 'Retain CSS when JavaScript is unavailable');
    assert.match(html, /data-hydrate="county"/, 'County pages must reuse their initial React markup');
    assert.match(html, /<script type="module" fetchpriority="low"/, 'County app downloads must not outrank visible text');
    const data = JSON.parse(html.match(/<script id="initial-location-data"[^>]*>(.*?)<\/script>/s)[1]);
    const expected = renderLocationContent(route, route.replace('/wedding-bands-', ''), data);
    assert.ok(html.includes(`<div data-initial-page-content="">${expected}</div>`), `${route} must use the same county layout as React`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal((html.match(/<article\b/g) || []).length, Math.min(9, data.bands.length) + (data.examples || []).length);
    if (['london', 'kent', 'essex', 'surrey', 'hertfordshire'].includes(route.replace('/wedding-bands-', ''))) {
      assert.equal(data.examples?.length, 1, 'Each original county must have its checked example evening');
      assert.match(html, /An example evening planned for this venue/);
      assert.doesNotMatch(JSON.stringify(data.examples), /docs\.google|clientName|clientEmail|sourceUrl/);
    }
  }
  if (route.startsWith('/act/')) {
    const history = JSON.parse(html.match(/<script id="initial-act-local-data"[^>]*>(.*?)<\/script>/s)?.[1] || 'null');
    assert.ok(history && history.slug === route.split('/').pop(), 'Band connection data must be available in initial HTML');
    assert.doesNotMatch(JSON.stringify(history), /docs\.google|clientName|clientEmail|sourceUrl/);
    if (history.venues.length) assert.match(html, /id="venues-and-locations"/);
    if (history.reviewCounties.length) assert.match(html, /Explore bands in/);
  }
}
console.log(`Verified visible initial content, schemas and published images on all ${routes.length} sitemap pages.`);
