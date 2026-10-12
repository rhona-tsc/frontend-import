import fs from 'node:fs/promises';
import path from 'node:path';
import { blogPosts } from '../data/BlogPosts.js';

const origin = 'https://thesupremecollective.co.uk';
const api = (process.env.SITEMAP_API_URL || process.env.VITE_BACKEND_URL || 'https://tsc-backend-v2.onrender.com').replace(/\/$/, '');
const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const template = await fs.readFile('dist/index.html', 'utf8');
const sitemap = await fs.readFile('dist/sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]));
const actPaths = urls.map(u => u.pathname).filter(p => p.startsWith('/act/'));

async function getAct(route) {
  const response = await fetch(`${api}/api/act/${route.split('/').pop()}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Cannot render ${route}: HTTP ${response.status}`);
  const result = await response.json();
  if (!result.success || !result.act?.tscName) throw new Error(`Missing public band content for ${route}`);
  return { route, act: result.act };
}
const acts = [];
// Bound concurrency to avoid flooding the public API during a deployment.
for (let index = 0; index < actPaths.length; index += 4) {
  acts.push(...await Promise.all(actPaths.slice(index, index + 4).map(getAct)));
}
const bandLinks = acts.map(({route, act}) => `<li><a href="${escape(route)}">${escape(act.tscName)}</a><p>${escape(plain(act.tscDescription || act.description))}</p></li>`).join('');
const paragraph = text => `<p>${escape(text)}</p>`;
async function writePage(route, title, description, heading, content) {
  const canonical = `${origin}${route}`;
  const head = `<title data-rh="true">${escape(title)}</title><meta data-rh="true" name="description" content="${escape(description)}"><link data-rh="true" rel="canonical" href="${escape(canonical)}"><meta data-rh="true" property="og:title" content="${escape(title)}"><meta data-rh="true" property="og:description" content="${escape(description)}"><meta data-rh="true" property="og:url" content="${escape(canonical)}">`;
  const body = `<header><a href="/">The Supreme Collective</a><nav><a href="/acts">Bands</a> · <a href="/blog">Blog</a> · <a href="/about">About</a> · <a href="/contact">Contact</a></nav></header><main><h1>${escape(heading)}</h1>${content}</main>`;
  const html = template.replace(/<title>.*?<\/title>/s, head).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  const directory = path.join('dist', route.replace(/^\//, ''));
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'index.html'), html);
}
await writePage('/', 'The Supreme Collective | Luxury Wedding & Event Bands', 'Luxury wedding and event bands across the UK. Browse acts, compare lineups, and get an instant quote.', 'Luxury Wedding & Event Bands', paragraph('Live bands for weddings, parties and corporate events across the UK. Browse our acts, watch performances and get a quote for your date and venue.') + `<ul>${bandLinks}</ul>`);
await writePage('/acts', 'Wedding & Event Bands for Hire | The Supreme Collective', 'Explore live bands for weddings, parties and corporate events across the UK. Watch performances, compare lineups and get a quote for your date and venue.', 'Wedding & Event Bands for Hire', `<ul>${bandLinks}</ul>`);
for (const {route, act} of acts) {
  const bio = plain(act.tscBio || act.bio);
  const genres = Array.isArray(act.genres) ? act.genres.slice(0, 2).filter(Boolean).join(', ') : '';
  const loc = act.baseCounty || act.address?.county || 'the UK';
  const description = `Book ${act.tscName} — premium live music for weddings & events. ${genres ? `Styles: ${genres}. ` : ''}Available across ${loc}. View videos & get an instant quote.`;
  await writePage(route, `${act.tscName} | Wedding Band for Hire | The Supreme Collective`, description, act.tscName, paragraph(plain(act.tscDescription || act.description)) + `<section><h2>About ${escape(act.tscName)}</h2>${paragraph(bio)}</section><p><a href="/acts">Compare our bands</a> · <a href="/contact">Contact us about your event</a></p>`);
}
await writePage('/blog', 'Wedding & Event Music Inspiration | The Supreme Collective', 'Ideas, insights and planning tips for unforgettable live music experiences.', 'Wedding and event inspiration', blogPosts.map(post => `<article><h2><a href="/blog/${escape(post.slug)}">${escape(post.title)}</a></h2>${paragraph(post.excerpt)}</article>`).join(''));
for (const post of blogPosts) {
  const content = (post.content || []).map(item => item.type === 'heading' ? `<h2>${escape(item.text)}</h2>` : item.text ? paragraph(item.text) : '').join('');
  await writePage(`/blog/${post.slug}`, post.metaTitle || post.title, post.metaDescription || post.excerpt, post.title, content);
}
console.log(`Rendered ${acts.length + blogPosts.length + 3} public pages with initial HTML content and metadata.`);
