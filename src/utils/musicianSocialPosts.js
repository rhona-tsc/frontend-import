const cleanUrl = (value) =>
  String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

const parseSocialPost = (value) => {
  const rawUrl = cleanUrl(value);
  if (!rawUrl) return null;

  let url;
  try {
    url = new URL(
      /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`,
    );
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "instagram.com") {
    const match = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i);
    if (!match) return null;
    const [, kind, shortcode] = match;
    return {
      key: `instagram-${shortcode}`,
      platform: "Instagram",
      embedUrl: `https://www.instagram.com/${kind}/${shortcode}/embed/`,
      aspectClass: "aspect-[4/5]",
    };
  }

  if (host.endsWith("tiktok.com")) {
    const match = url.pathname.match(/\/video\/(\d+)/i);
    if (!match) return null;
    const postId = match[1];
    return {
      key: `tiktok-${postId}`,
      platform: "TikTok",
      embedUrl: `https://www.tiktok.com/player/v1/${postId}?description=0&music_info=0&rel=0&autoplay=0`,
      aspectClass: "aspect-[9/16]",
    };
  }

  if (host === "facebook.com" || host === "m.facebook.com") {
    const isSpecificPost =
      /\/(reel|videos|posts|permalink|watch)\//i.test(url.pathname) ||
      url.searchParams.has("v") ||
      url.searchParams.has("story_fbid");
    if (!isSpecificPost) return null;

    const plugin = /\/(reel|videos|watch)\//i.test(url.pathname)
      ? "video.php"
      : "post.php";
    const canonicalUrl = url.toString();
    return {
      key: `facebook-${canonicalUrl}`,
      platform: "Facebook",
      embedUrl: `https://www.facebook.com/plugins/${plugin}?href=${encodeURIComponent(
        canonicalUrl,
      )}&show_text=false&width=500`,
      aspectClass: "aspect-[4/5]",
    };
  }

  return null;
};

const parseStoredSocialPost = (item) => {
  if (!item || item.visible === false) return null;

  const platform = String(item.platform || "").toLowerCase();
  const mediaUrl = cleanUrl(item.mediaUrl);
  if (platform === "tiktok" && mediaUrl) {
    let embedUrl;
    try {
      const parsedUrl = new URL(mediaUrl);
      if (!parsedUrl.hostname.toLowerCase().endsWith("tiktok.com")) return null;
      parsedUrl.searchParams.set("hide_author", "1");
      embedUrl = parsedUrl.toString();
    } catch {
      return null;
    }

    return {
      key: `tiktok-import-${item._id || embedUrl}`,
      platform: "TikTok",
      embedUrl,
      aspectClass: "aspect-[9/16]",
    };
  }

  return parseSocialPost(item.url);
};

export const getMusicianSocialPosts = (musician) => {
  const links = [
    ...(Array.isArray(musician?.socialHighlightPostLinks)
      ? musician.socialHighlightPostLinks
      : []),
    // Backward compatibility for social posts saved in the old video fields.
    ...(Array.isArray(musician?.functionBandVideoLinks)
      ? musician.functionBandVideoLinks
      : []),
    ...(Array.isArray(musician?.originalBandVideoLinks)
      ? musician.originalBandVideoLinks
      : []),
  ];

  const seen = new Set();
  return links
    .map(parseStoredSocialPost)
    .filter((post) => {
      if (!post || seen.has(post.key)) return false;
      seen.add(post.key);
      return true;
    })
    .slice(0, 6);
};
