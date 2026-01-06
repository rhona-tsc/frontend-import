import fs from "fs";
import path from "path";
import { SitemapStream, streamToPromise } from "sitemap";

const SITE_URL = "https://thesupremecollective.co.uk";
const API_URL =
  process.env.VITE_BACKEND_URL ||
  process.env.SITEMAP_API_URL ||
  "https://tsc-backend-v2.onrender.com";
const CORE_PAGES = ["/", "/acts", "/about", "/contact"]; // edit to match your site

async function fetchActIds() {
  // Backend endpoint you’ll add below
  const res = await fetch(`${API_URL}/api/sitemap/act-ids`);
  if (!res.ok) throw new Error(`Failed to fetch act ids: ${res.status}`);
  return res.json(); // expects: ["6803...", "6804...", ...]
}

async function run() {
  const sm = new SitemapStream({ hostname: SITE_URL });

  // Core pages
  for (const p of CORE_PAGES) {
    sm.write({ url: p, changefreq: "weekly", priority: 0.8 });
  }

  // Act pages: /act/:id
  const ids = await fetchActIds();
  for (const id of ids) {
    sm.write({ url: `/act/${id}`, changefreq: "weekly", priority: 0.7 });
  }

  sm.end();
  const xml = (await streamToPromise(sm)).toString();

  const outPath = path.join(process.cwd(), "public", "sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf8");
  console.log(`✅ Wrote ${outPath} (${ids.length} act URLs)`);
}

run().catch((e) => {
  console.error("❌ Sitemap generation failed:", e);
  process.exit(1);
});