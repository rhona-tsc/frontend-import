import { Helmet } from "react-helmet-async";

const ORIGIN = "https://thesupremecollective.co.uk";

export default function SEO({
  title,
  description,
  path = "/",
  image,
  noindex = false,
}) {
  const normalizedPath = path?.startsWith("/") ? path : `/${path || ""}`;
  const url = `${ORIGIN}${normalizedPath}`;
  const safeTitle = title?.trim() || "The Supreme Collective";
  const safeDesc =
    description?.trim() ||
    "Luxury wedding and event bands across the UK. Browse acts, compare lineups, and get an instant quote.";

  return (
    <Helmet>
      <title>{safeTitle}</title>
      <meta name="description" content={safeDesc} />
      <link rel="canonical" href={url} />

      {noindex && <meta name="robots" content="noindex,follow" />}

      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image || `${ORIGIN}/og-default.jpg`} />

      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDesc} />
      <meta name="twitter:image" content={image || `${ORIGIN}/og-default.jpg`} />
    </Helmet>
  );
}