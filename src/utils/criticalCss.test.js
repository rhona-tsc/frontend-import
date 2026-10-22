import test from 'node:test';
import assert from 'node:assert/strict';
import { extractInitialCss, inlineInitialCss } from '../scripts/criticalCss.mjs';

test('extracts reset, fonts, initial classes and responsive states from compiled CSS', () => {
  const css = '@font-face{font-family:Outfit;font-display:swap;src:url(/font.woff2)}*{box-sizing:border-box}body{margin:0}.used{color:red}.unused{color:blue}@media(min-width:640px){.sm\\:p-6{padding:1.5rem}.unused{margin:0}}.group:hover .group-hover\\:opacity-100{opacity:1}@keyframes spin{to{transform:rotate(360deg)}}';
  const result = extractInitialCss(css, '<div class="used sm:p-6 group group-hover:opacity-100"></div>');
  for (const token of ['@font-face', 'box-sizing', 'body{margin:0}', '.used{', '@media', '.sm\\:p-6', '.group:hover', '@keyframes']) assert.ok(result.includes(token), token);
  assert.ok(!result.includes('.unused'));
});
test('keeps functional selectors conservatively rather than losing a matching alternative', () => {
  assert.match(extractInitialCss(':is(.present,.absent){color:red}', '<p class="present">Text</p>'), /:is/);
});
test('loads full CSS without blocking initial paint and retains the no-JavaScript fallback', () => {
  const link = '<link rel="stylesheet" crossorigin href="/assets/main.css">';
  const html = `<head>${link}</head><body><p class="used">Text</p></body>`;
  const result = inlineInitialCss(html, 'body{margin:0}.used{color:red}.unused{color:blue}', link, '/assets/main.css');
  assert.match(result, /<style id="initial-page-styles">body\{margin:0\}\.used\{color:red\}<\/style>/);
  assert.match(result, /rel="preload" as="style"/);
  assert.match(result, /onload="this.onload=null;this.rel='stylesheet'"/);
  assert.ok(result.includes(`<noscript>${link}</noscript>`));
  assert.ok(!result.replace(/<noscript>[\s\S]*?<\/noscript>/g, '').includes('rel="stylesheet"'));
});
test('guards against accidentally inlining the entire application stylesheet', () => {
  assert.throws(() => inlineInitialCss('<link>', 'body{--large:' + 'x'.repeat(24000) + '}', '<link>', '/main.css'), /budget/);
});
