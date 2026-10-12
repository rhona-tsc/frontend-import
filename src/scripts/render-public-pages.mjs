import fs from 'node:fs/promises';
import path from 'node:path';
import { blogPosts } from '../data/BlogPosts.js';
import { buildActMeta } from '../utils/actSeo.js';
import { buildPageSchema, serializeSchema } from '../utils/structuredData.js';

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
  const act = acts.find(item => item.route === route)?.act;
  const post = blogPosts.find(item => `/blog/${item.slug}` === route);
  const schema = buildPageSchema({ route, title, description, act, post, bands: acts });
  const breadcrumbItems = schema['@graph'].find(item => item['@type'] === 'BreadcrumbList')?.itemListElement || [];
  const breadcrumbs = breadcrumbItems.length ? `<nav aria-label="Breadcrumb">${breadcrumbItems.map(item => `<a href="${escape(item.item)}">${escape(item.name)}</a>`).join(' / ')}</nav>` : '';
  const head = `<title data-rh="true">${escape(title)}</title><meta data-rh="true" name="description" content="${escape(description)}"><link data-rh="true" rel="canonical" href="${escape(canonical)}"><meta data-rh="true" property="og:title" content="${escape(title)}"><meta data-rh="true" property="og:description" content="${escape(description)}"><meta data-rh="true" property="og:url" content="${escape(canonical)}">`;
  const body = `<header><a href="/">The Supreme Collective</a><nav><a href="/acts">Bands</a> · <a href="/blog">Blog</a> · <a href="/about">About</a> · <a href="/contact">Contact</a></nav></header><main>${breadcrumbs}<h1>${escape(heading)}</h1>${content}</main>`;
  const html = template.replace(/<title>.*?<\/title>/s, head + `<script id="initial-page-schema" data-page-path="${escape(route)}" type="application/ld+json">${serializeSchema(schema)}</script>`).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  const directory = path.join('dist', route.replace(/^\//, ''));
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'index.html'), html);
}
await writePage('/', 'The Supreme Collective | Luxury Wedding & Event Bands', 'Luxury wedding and event bands across the UK. Browse acts, compare lineups, and get an instant quote.', 'Luxury Wedding & Event Bands', paragraph('Live bands for weddings, parties and corporate events across the UK. Browse our acts, watch performances and get a quote for your date and venue.') + `<ul>${bandLinks}</ul>`);
await writePage('/acts', 'Wedding & Event Bands for Hire | The Supreme Collective', 'Explore live bands for weddings, parties and corporate events across the UK. Watch performances, compare lineups and get a quote for your date and venue.', 'Wedding & Event Bands for Hire', `<ul>${bandLinks}</ul>`);
const aboutSource = await fs.readFile('src/pages/About.jsx', 'utf8');
const aboutParagraphs = [...aboutSource.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map(match => plain(match[1])).filter(Boolean);
await writePage('/about', 'About Our Live Music Agency | The Supreme Collective', 'Meet The Supreme Collective, a live music agency bringing professional bands to weddings, parties and corporate events across the UK and beyond.', 'About Us', aboutParagraphs.map(paragraph).join(''));
await writePage('/contact', 'Contact | The Supreme Collective', 'Contact The Supreme Collective to discuss live music for your wedding, party or corporate event.', 'Contact The Supreme Collective', paragraph('Get in touch to discuss your event and find the right live band.') + '<p><a href="mailto:hello@thesupremecollective.co.uk">hello@thesupremecollective.co.uk</a></p><p><a href="/acts">Explore our bands</a></p>');
await writePage('/venues', 'Venue Guide | The Supreme Collective', 'Practical venue and room information from previous Supreme Collective events, including access, parking, changing facilities and sound restrictions.', 'The Supreme Collective Venue Guide', paragraph('Search our venue guide for practical information gathered from venues and previous events, including room-specific sound restrictions, parking, access and changing facilities.'));
for (const {route, act} of acts) {
  const bio = plain(act.tscBio || act.bio);
  const meta = buildActMeta(act);
  await writePage(route, meta.title, meta.description, act.tscName, paragraph(plain(act.tscDescription || act.description)) + `<section><h2>About ${escape(act.tscName)}</h2>${paragraph(bio)}</section><p><a href="/acts">Compare our bands</a> · <a href="/contact">Contact us about your event</a></p>`);
}
await writePage('/blog', 'Wedding & Event Music Inspiration | The Supreme Collective', 'Ideas, insights and planning tips for unforgettable live music experiences.', 'Wedding and event inspiration', blogPosts.map(post => `<article><h2><a href="/blog/${escape(post.slug)}">${escape(post.title)}</a></h2>${paragraph(post.excerpt)}</article>`).join(''));
for (const post of blogPosts) {
  const hero = post.heroImage ? `<img src="${escape(post.heroImage)}" alt="${escape(post.heroImageAlt || post.title)}" width="1920" height="1080">` : '';
  const content = hero + (post.content || []).map(item => item.type === 'heading' ? `<h2>${escape(item.text)}</h2>` : item.type === 'image' ? `<img src="${escape(item.src)}" alt="${escape(item.alt || `Illustration for ${post.title}`)}" loading="lazy">` : item.text ? paragraph(item.text) : '').join('');
  await writePage(`/blog/${post.slug}`, post.metaTitle || post.title, post.metaDescription || post.excerpt, post.title, content);
}
console.log(`Rendered ${acts.length + blogPosts.length + 6} public pages with initial HTML content and metadata.`);
