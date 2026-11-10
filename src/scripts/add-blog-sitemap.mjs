import fs from "node:fs";
import { blogPosts } from "../data/BlogPosts.js";
import { contentDate } from '../utils/contentDates.js';

const sitemapPath = new URL("../../public/sitemap.xml", import.meta.url);
let xml = fs.readFileSync(sitemapPath, "utf8");
for (const post of blogPosts) {
  const slug = String(post.slug || "").trim();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) continue;
  const url = `https://thesupremecollective.co.uk/blog/${slug}/`;
  if (xml.includes(`<loc>${url}</loc>`)) continue;
  const modified = contentDate(post.updatedAt || post.modifiedAt);
  xml = xml.replace("</urlset>", `<url><loc>${url}</loc>${modified ? `<lastmod>${modified}</lastmod>` : ''}</url></urlset>`);
}
fs.writeFileSync(sitemapPath, xml);
