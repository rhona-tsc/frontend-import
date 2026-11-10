import fs from "fs";
import path from "path";
import { SitemapStream, streamToPromise } from "sitemap";
import { genrePages } from '../data/genrePages.js';
import { locationPages } from '../data/locationPages.js';
import { publicHref } from '../utils/publicUrls.js';
import { contentDate } from '../utils/contentDates.js';

const SITE_URL = "https://thesupremecollective.co.uk";
const API_URL =
  process.env.VITE_BACKEND_URL ||
  process.env.SITEMAP_API_URL ||
  "https://tsc-backend-v2.onrender.com";

const CORE_PAGES = [
  { url: "/", changefreq: "weekly", priority: 1.0 },
  { url: "/acts", changefreq: "weekly", priority: 0.9 },
  { url: "/about", changefreq: "monthly", priority: 0.6 },
  { url: "/contact", changefreq: "monthly", priority: 0.6 },
  { url: "/blog", changefreq: "weekly", priority: 0.7 },
  { url: "/venues", changefreq: "weekly", priority: 0.7 },
  { url: "/privacy", changefreq: "yearly", priority: 0.3 },
  { url: "/terms", changefreq: "yearly", priority: 0.3 },
  ...genrePages.map(({ slug }) => ({ url: `/${slug}` })),
  ...locationPages.map(({ slug }) => ({ url: `/wedding-bands-${slug}`, changefreq: 'weekly', priority: 0.8 })),
];

async function fetchActSlugs() {
  const res = await fetch(`${API_URL}/api/sitemap/act-slugs`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Failed to fetch act slugs: ${res.status}`);

  const slugs = await res.json();

  if (!Array.isArray(slugs)) throw new Error('Invalid published act inventory');
  return [...new Set(slugs.map(slug => String(slug || '').trim().toLowerCase()))]
    .filter(slug => /^[a-z0-9-]+$/.test(slug) && !slug.startsWith('test-'));
}

async function run() {
  const sm = new SitemapStream({ hostname: SITE_URL });

  for (const p of CORE_PAGES) {
    sm.write({ url: publicHref(p.url) });
  }

  const slugs = await fetchActSlugs();
  for (let index = 0; index < slugs.length; index += 4) {
    const entries = await Promise.all(slugs.slice(index, index + 4).map(async slug => {
      const response = await fetch(`${API_URL}/api/act/${slug}`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Published act ${slug}: HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success || data.act?.slug !== slug) throw new Error(`Published act mismatch: ${slug}`);
      return { url: publicHref(`/act/${slug}`), lastmod: contentDate(data.act.updatedAt) };
    }));
    entries.forEach(entry => sm.write(entry));
  }

  sm.end();
  const xml = (await streamToPromise(sm)).toString();

  const outPath = path.join(process.cwd(), "public", "sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf8");
  console.log(`✅ Wrote ${outPath} (${slugs.length} act URLs)`);
}

run().catch((e) => {
  console.error("❌ Sitemap generation failed:", e);
  process.exit(1);
});
