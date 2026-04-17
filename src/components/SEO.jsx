import { Helmet } from "react-helmet-async";

const ORIGIN = "https://thesupremecollective.co.uk";

export function SEO({
  title,
  description,
  path = "/",
  image,
  noindex = false,
}) {
  const cleanPath = String(path || "/").split("?")[0].split("#")[0];
  const withLeadingSlash = cleanPath.startsWith("/")
    ? cleanPath
    : `/${cleanPath}`;
  const normalizedPath =
    withLeadingSlash.length > 1
      ? withLeadingSlash.replace(/\/+$/, "")
      : "/";

  const url = `${ORIGIN}${normalizedPath}`;
  const safeTitle = title?.trim() || "The Supreme Collective";
  const safeDesc =
    description?.trim() ||
    "Luxury wedding and event bands across the UK. Browse acts, compare lineups, and get an instant quote.";
  const safeImage = image || `${ORIGIN}/og-default.jpg`;

  return (
    <Helmet>
      <title>{safeTitle}</title>
      <meta name="description" content={safeDesc} />
      <link rel="canonical" href={url} />

      {noindex && <meta name="robots" content="noindex,follow" />}

      <meta property="og:type" content="website" />
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={safeImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDesc} />
      <meta name="twitter:image" content={safeImage} />
    </Helmet>
  );
}

export default SEO;