import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
import { blogPosts } from '../data/BlogPosts.js';
import { buildActMeta } from '../utils/actSeo.js';
import { buildPageSchema, serializeSchema } from '../utils/structuredData.js';
import { getBandImageAlt } from '../utils/bandImageAlt.js';
import { cleanVenueName } from '../utils/venueName.js';
import { locationPages, locationMeta, locationCopy, contactOptions } from '../data/locationPages.js';

const origin = 'https://thesupremecollective.co.uk';
const api = (process.env.SITEMAP_API_URL || process.env.VITE_BACKEND_URL || 'https://tsc-backend-v2.onrender.com').replace(/\/$/, '');
const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const template = await fs.readFile('dist/index.html', 'utf8');
const sitemap = await fs.readFile('dist/sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]));
const actPaths = urls.map(u => u.pathname).filter(p => p.startsWith('/act/'));

// Distribute the unmodified font copyright notices with the hosted files.
await fs.mkdir('dist/font-licenses', { recursive: true });
await Promise.all([
  fs.copyFile('node_modules/@fontsource-variable/outfit/LICENSE', 'dist/font-licenses/outfit.txt'),
  fs.copyFile('node_modules/@fontsource/prata/LICENSE', 'dist/font-licenses/prata.txt'),
]);

// Use the same React components and hashed asset URLs as the browser build.
// The renderer stays outside dist so no build-only code is published.
const rendererDirectory = path.resolve('node_modules/.cache/tsc-public-render');
await build({
  logLevel: 'error',
  ssr: { noExternal: ['react-helmet-async'] },
  build: {
    ssr: 'src/entry-public.jsx', outDir: rendererDirectory, emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'entry-public.mjs' } },
  },
});
const { renderLocationContent, renderPublicShell, renderHomeContent, renderStaticContent, renderCountyApp } = await import(pathToFileURL(path.join(rendererDirectory, 'entry-public.mjs')).href);

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
let renderedCount = 0;
async function writePage(route, title, description, heading, content, location) {
  const canonical = `${origin}${route}`;
  const act = acts.find(item => item.route === route)?.act;
  const post = blogPosts.find(item => `/blog/${item.slug}` === route);
  const schema = buildPageSchema({ route, title, description, act, post, bands: acts, location });
  const breadcrumbItems = schema['@graph'].find(item => item['@type'] === 'BreadcrumbList')?.itemListElement || [];
  const breadcrumbs = breadcrumbItems.length ? `<nav aria-label="Breadcrumb">${breadcrumbItems.map(item => `<a href="${escape(item.item)}">${escape(item.name)}</a>`).join(' / ')}</nav>` : '';
  const head = `<title data-rh="true">${escape(title)}</title><meta data-rh="true" name="description" content="${escape(description)}"><link data-rh="true" rel="canonical" href="${escape(canonical)}"><meta data-rh="true" property="og:title" content="${escape(title)}"><meta data-rh="true" property="og:description" content="${escape(description)}"><meta data-rh="true" property="og:url" content="${escape(canonical)}">`;
  const pageContent = location
    ? renderLocationContent(route, route.replace('/wedding-bands-', ''), location)
    : route === '/' ? renderHomeContent(content)
    : renderStaticContent(route) || `<main class="initial-public-content">${breadcrumbs}<h1>${escape(heading)}</h1>${content}</main>`;
  const body = location ? renderCountyApp(route, route.replace('/wedding-bands-', ''), location) : renderPublicShell(route, pageContent);
  // Only preload the display face where it is used above the fold.
  const pageTemplate = route === '/' || location ? template : template.replace(/<link\b(?=[^>]*data-font="heading")[^>]*>\s*/g, '');
  const html = pageTemplate
    .replace(
      /<title>.*?<\/title>/s,
      head + `<script id="initial-page-schema" data-page-path="${escape(route)}" type="application/ld+json">${serializeSchema(schema)}</script>` + (location ? `<script id="initial-location-data" data-county="${escape(location.county.toLowerCase().replace(/\s+/g, '-'))}" type="application/json">${serializeSchema(location)}</script>` : ''),
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered${location ? ' data-hydrate="county"' : ''}>${body}</div>`,
    );
  const directory = path.join('dist', route.replace(/^\//, ''));
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'index.html'), html);
  renderedCount += 1;
}
await writePage('/', 'The Supreme Collective | Luxury Wedding & Event Bands', 'Luxury wedding and event bands across the UK. Browse acts, compare lineups, and get an instant quote.', 'Luxury Wedding & Event Bands', paragraph('Live bands for weddings, parties and corporate events across the UK. Browse our acts, watch performances and get a quote for your date and venue.') + `<ul>${bandLinks}</ul>`);
await writePage('/acts', 'Wedding & Event Bands for Hire | The Supreme Collective', 'Explore live bands for weddings, parties and corporate events across the UK. Watch performances, compare lineups and get a quote for your date and venue.', 'Wedding & Event Bands for Hire', `<ul>${bandLinks}</ul>`);
const aboutSource = await fs.readFile('src/pages/About.jsx', 'utf8');
const aboutParagraphs = [...aboutSource.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map(match => plain(match[1])).filter(Boolean);
await writePage('/about', 'About Our Live Music Agency | The Supreme Collective', 'Meet The Supreme Collective, a live music agency bringing professional bands to weddings, parties and corporate events across the UK and beyond.', 'About Us', aboutParagraphs.map(paragraph).join(''));
await writePage('/contact', 'Contact | The Supreme Collective', 'Contact The Supreme Collective to discuss live music for your wedding, party or corporate event.', 'Contact The Supreme Collective', paragraph('Get in touch to discuss your event and find the right live band.') + '<p><a href="mailto:hello@thesupremecollective.co.uk">hello@thesupremecollective.co.uk</a></p><p><a href="/acts">Explore our bands</a></p>');
await writePage('/terms', 'The Supreme Collective Terms of Service', 'Read the Terms of Service for The Supreme Collective website, musician profiles and live music services.', 'Terms of Service', '');
await writePage('/privacy', 'Privacy Policy | The Supreme Collective', 'How The Supreme Collective handles your personal information.', 'Privacy Policy', '');
await writePage('/venues', 'Venue Guide | The Supreme Collective', 'Practical venue and room information from previous Supreme Collective events, including access, parking, changing facilities and sound restrictions.', 'The Supreme Collective Venue Guide', paragraph('Search our venue guide for practical information gathered from venues and previous events, including room-specific sound restrictions, parking, access and changing facilities.'));
for (const {route, act} of acts) {
  const bio = plain(act.tscBio || act.bio);
  const meta = buildActMeta(act);
  const photos = (act.images || []).filter(image => image?.url).map((image, index) => `<img src="${escape(image.url.replace('/upload/', '/upload/w_960,c_limit,f_auto,q_auto/'))}" alt="${escape(getBandImageAlt(image, act, index))}" width="480" style="max-width:100%;height:auto" loading="lazy">`).join('');
  const gallery = photos ? `<section><h2>${escape(act.tscName)} photographs</h2>${photos}</section>` : '';
  await writePage(route, meta.title, meta.description, act.tscName, paragraph(plain(act.tscDescription || act.description)) + `<section><h2>About ${escape(act.tscName)}</h2>${paragraph(bio)}</section>${gallery}<p><a href="/acts">Compare our bands</a> · <a href="/contact">Contact us about your event</a></p>`);
}
await writePage('/blog', 'Wedding & Event Music Inspiration | The Supreme Collective', 'Ideas, insights and planning tips for unforgettable live music experiences.', 'Wedding and event inspiration', blogPosts.map(post => `<article><h2><a href="/blog/${escape(post.slug)}">${escape(post.title)}</a></h2>${paragraph(post.excerpt)}</article>`).join(''));
for (const post of blogPosts) {
  const hero = post.heroImage ? `<img src="${escape(post.heroImage)}" alt="${escape(post.heroImageAlt || post.title)}" width="1920" height="1080">` : '';
  const content = hero + (post.content || []).map(item => item.type === 'heading' ? `<h2>${escape(item.text)}</h2>` : item.type === 'image' ? `<img src="${escape(item.src)}" alt="${escape(item.alt || `Illustration for ${post.title}`)}" loading="lazy">` : item.text ? paragraph(item.text) : '').join('');
  await writePage(`/blog/${post.slug}`, post.metaTitle || post.title, post.metaDescription || post.excerpt, post.title, content);
}
const locationResponse = await fetch(`${api}/api/locations/public`, { signal: AbortSignal.timeout(30000) });
if (!locationResponse.ok) throw new Error(`Location data unavailable: HTTP ${locationResponse.status}`);
const locationResult = await locationResponse.json();
if (!locationResult.success) throw new Error('Location data unavailable');
for (const config of locationPages) {
  const rawData = locationResult.locations?.[config.slug];
  if (!rawData?.bands?.length || rawData.county !== config.name) throw new Error(`Missing location content for ${config.name}`);
  const data = { ...rawData, venues: rawData.venues.map(venue => ({ ...venue, name: cleanVenueName(venue.name) })) };
  const meta = locationMeta(config);
  const bandCards = data.bands.slice(0, 9).map(band => `<article><h3><a href="/act/${escape(band.slug)}">${escape(band.name)}</a></h3><img src="${escape(band.image)}" alt="${escape(getBandImageAlt(band.image, { tscName: band.name }))}" width="480" loading="lazy">${band.hasLocalOriginal ? paragraph(locationCopy.localBadge) : ''}${band.hasVenueExperience ? paragraph(locationCopy.venueExperience(config.name)) : ''}${paragraph(band.description || band.genres.join(', '))}<a href="/act/${escape(band.slug)}">Watch performances &amp; explore lineups</a></article>`).join('');
  const venueLinks = data.venues.map(venue => `<li><a href="/venues?venue=${escape(encodeURIComponent(venue.id))}&amp;county=${escape(encodeURIComponent(venue.county))}">${escape(venue.name)}</a></li>`).join('');
  const reviews = data.reviews.map(review => `<figure><blockquote>${escape(review.comment)}</blockquote><figcaption>${escape(review.author)} · <a href="/act/${escape(review.actSlug)}">${escape(review.actName)}</a>${review.eventType ? ` · ${escape(review.eventType)}` : ''}</figcaption></figure>`).join('');
  const faq = [...config.faqs, locationCopy.priceFaq].map(item => `<h3>${escape(item.q)}</h3>${paragraph(item.a)}`).join('');
  const nearby = locationPages.filter(item => item.slug !== config.slug).map(item => `<a href="/wedding-bands-${item.slug}">${item.name}</a>`).join(' · ');
  const directLinks = contactOptions.map(option => `<a href="${escape(option.href)}"${option.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(option.label)}</a>`).join(' · ');
  const contact = `<section id="contact-options"><h2>Let’s find your wedding band</h2>${paragraph('Add your date and venue to explore bands and travel pricing, or talk through your ideas with us directly.')}<a href="/acts">Add your date &amp; venue</a><p>Prefer a conversation? ${directLinks}</p></section>`;
  const content = paragraph(config.intro) + `<p><a href="/acts">Add your date &amp; venue</a> · <a href="#bands">Explore the bands</a> · <a href="#contact-options">Email, WhatsApp, text or book a call</a></p><section id="bands"><h2>Bands for your ${config.name} wedding</h2>${paragraph(locationCopy.bandsIntro)}${bandCards}<a href="/acts">Explore all our bands</a></section><section><h2>${escape(config.planningTitle)}</h2><ul>${config.planning.map(tip => `<li>${escape(tip)}</li>`).join('')}</ul>${paragraph(locationCopy.areaIntro(config))}</section><section><h2>Explore wedding venues in ${config.name}</h2>${paragraph(locationCopy.venueIntro(config.name))}<ul>${venueLinks}</ul></section>${reviews ? `<section><h2>What clients say about events in ${config.name}</h2>${reviews}</section>` : ''}<section><h2>Your ${config.name} wedding music questions</h2>${faq}</section>${contact}<section><h2>Explore more locations</h2>${nearby}</section>`;
  await writePage(`/wedding-bands-${config.slug}`, meta.title, meta.description, `Wedding bands in ${config.name}`, content, data);
}
console.log(`Rendered ${renderedCount} public pages with visible initial HTML content and metadata.`);
