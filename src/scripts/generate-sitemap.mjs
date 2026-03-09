import fs from "fs";
import path from "path";
import { SitemapStream, streamToPromise } from "sitemap";

const SITE_URL = "https://thesupremecollective.co.uk";
const API_URL =
  process.env.VITE_BACKEND_URL ||
  process.env.SITEMAP_API_URL ||
  "https://tsc-backend-v2.onrender.com";
const CORE_PAGES = ["/", "/acts", "/about", "/contact"]; // edit to match your site

async function fetchActSlugs() {
  const res = await fetch(`${API_URL}/api/sitemap/act-slugs`);
  if (!res.ok) throw new Error(`Failed to fetch act slugs: ${res.status}`);

  const slugs = await res.json();

  return (Array.isArray(slugs) ? slugs : []).filter((slug) => {
    const cleanSlug = String(slug || "").trim().toLowerCase();
    if (!cleanSlug) return false;
    if (cleanSlug === "test-soul-allegiance") return false;
    if (cleanSlug.startsWith("test-")) return false;
    return true;
  });
}

async function run() {
  const sm = new SitemapStream({ hostname: SITE_URL });

  // Core pages
  for (const p of CORE_PAGES) {
    sm.write({ url: p, changefreq: "weekly", priority: 0.8 });
  }

  // Act pages: /act/:slugs
  const slugs = await fetchActSlugs();
  for (const slug of slugs) {
    sm.write({ url: `/act/${slug}`, changefreq: "weekly", priority: 0.7 });
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