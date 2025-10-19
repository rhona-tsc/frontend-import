
import { assets } from "../assets/assets"; // top-level import
const PUBLIC_SITE_BASE =
  import.meta.env.FRONTEND_URL ||
  window.location.origin; // fallback to current site origin

// Extract a valid http(s) URL from an object that may have profile fields.
// We ONLY accept `profilePicture` (string URL). Anything else is ignored.
const pickProfilePicture = (obj = {}) => {
  const v = obj && typeof obj.profilePicture === "string" ? obj.profilePicture.trim() : "";
  return v && v.startsWith("http") ? v : "";
};

// Reusable badge: crops a circular performer photo and overlays the ring+ribbon
export function FeaturedVocalistBadge({
  imageUrl,
  pictureSource = null,   // optional object that may contain { profilePicture: "https://..." }
  size = 140,
  photoScale = 0.74,
  photoOffsetY = -4,
  variant = "lead",        // keep for future 'deputy' ribbon swaps
  cacheBuster = "",        // append ?v=... to bust cache
  className = "",
  musicianId = "",
  profileUrl = "",         // optional explicit URL; overrides musicianId if provided
}) {
  // Group logs for this render
  console.groupCollapsed(
    `🎨 [FeaturedVocalistBadge] BEGIN (variant: ${variant})`
  );
  console.log("Props received:", {
    imageUrl,
    pictureSource,
    size,
    photoScale,
    photoOffsetY,
    variant,
    cacheBuster,
    className,
    musicianId,
    profileUrl,
  });

  const inner = Math.round(size * photoScale);
  const ringSrc =
    variant === "deputy"
      ? assets.Deputy_Vocalist_Available
      : assets.Featured_Vocalist_Available;
  console.log("Ring image used:", ringSrc);

  // If no explicit imageUrl was passed, try to derive it from pictureSource (profilePicture only)
  const resolvedImageUrl = imageUrl || pickProfilePicture(pictureSource || {});
  console.log("resolvedImageUrl:", resolvedImageUrl);

  const hasValidUrl =
    typeof resolvedImageUrl === "string" &&
    resolvedImageUrl.trim().startsWith("http");
  console.log("hasValidUrl:", hasValidUrl);

  const imgSrc =
    hasValidUrl && cacheBuster
      ? `${resolvedImageUrl}${resolvedImageUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(cacheBuster)}`
      : hasValidUrl
      ? resolvedImageUrl
      : "";
  console.log("imgSrc:", imgSrc);

  // Compute final profile URL with fallbacks:
  // 1) explicit profileUrl prop
  // 2) constructed from musicianId prop
  // 3) pictureSource.profileUrl (if provided)
  // 4) constructed from pictureSource.musicianId
  const sourceProfileUrl =
    pictureSource && typeof pictureSource.profileUrl === "string"
      ? pictureSource.profileUrl.trim()
      : "";
  const sourceMusicianUrl =
    pictureSource && pictureSource.musicianId
      ? `${PUBLIC_SITE_BASE}/musician/${pictureSource.musicianId}`
      : "";
  const effectiveProfileUrl =
    (profileUrl || "").trim() ||
    (musicianId ? `${PUBLIC_SITE_BASE}/musician/${musicianId}` : "") ||
    sourceProfileUrl ||
    sourceMusicianUrl;
  console.log("effectiveProfileUrl:", effectiveProfileUrl);

  // Log before rendering
  console.log("Rendering state summary:", {
    resolvedImageUrl,
    imgSrc,
    hasValidUrl,
    effectiveProfileUrl,
    ringSrc,
    inner,
  });

  if (!imgSrc) {
    console.warn("❌ No valid image found – skipping render (no badge shown)");
    console.groupEnd();
    return null;
  }

  // Render
  console.log("✅ Rendering badge DOM (image and ring)...");
  const badgeDom = (
    <div className={`inline-flex flex-col items-center ${className}`} style={{ width: size }}>
      <div
        className={`relative select-none z-10`}
        style={{
          width: size,
          height: size,
          minHeight: size,
          position: "relative",
          overflow: "visible",
        }}
        aria-label="Vocalist featured & available"
      >
        <img
          src={imgSrc}
          alt=""
          className="absolute rounded-full object-cover shadow-sm"
          style={{
            width: inner,
            height: inner,
            left: "50%",
            top: "50%",
            transform: `translate(-50%, calc(-50% + ${photoOffsetY}px))`,
          }}
          draggable={false}
        />
        <img
          src={ringSrc}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none"
          draggable={false}
        />
      </div>
      {effectiveProfileUrl && (
        <a
          href={effectiveProfileUrl}
          className="text-[14px] text-blue-600 underline block mt-1"
          target="_blank"
          rel="noreferrer"
        >
          View Profile
        </a>
      )}
    </div>
  );
  console.groupEnd();
  return badgeDom;
}

// Wrapper: show lead badge or up to 3 deputy badges when lead isn't available
// Usage:
//   <VocalistFeaturedAvailable
//     badge={act.availabilityBadge}
//     size={140}
//     cacheBuster={act?.availabilityBadge?.setAt}
//     className="mt-2"
//   />
//
// Expected `badge` shape (server):
// {
//   active: boolean,
//   photoUrl?: string,
//   profilePicture?: string,
//   vocalistName?: string,
//   musicianId?: string,
//   setAt?: string|number|Date,
//   deputies?: Array<{
//     profilePicture?: string,
//     photoUrl?: string,
//     musicianId?: string,
//     profileUrl?: string,
//     setAt?: string|number|Date
//   }>
// }
export function VocalistFeaturedAvailable({
  badge = null,
  size = 140,
  cacheBuster = "",
  className = "",
}) {
  console.group("🎤 [VocalistFeaturedAvailable] BEGIN");
  if (!badge) {
    console.warn("❌ No badge prop received – skipping render");
    console.groupEnd();
    return null;
  }

  // Log props and badge
  console.log("Props received:", { badge, size, cacheBuster, className });
  console.log("Full badge object:", badge);
  const deputies = Array.isArray(badge.deputies) ? badge.deputies.slice(0, 3) : [];
  const hasDeputies = deputies.length > 0;
  console.log("Derived variables:", {
    deputies,
    hasDeputies,
    badgeActive: badge.active,
    badgeIsDeputy: badge.isDeputy,
  });

  // Branch 1: Lead not active but deputies exist → show deputies
  if (!badge.active && hasDeputies) {
    console.group("🎭 Deputies branch");
    console.log(
      "Condition: !badge.active && hasDeputies === true. Rendering deputies array."
    );
    const deputiesDom = (
      <div className={`flex gap-3 items-center ${className}`}>
        {deputies.map((d, i) => {
          const musId = String(d?.musicianId || "");
          const profile =
            (d?.profileUrl && String(d.profileUrl)) ||
            (musId ? `${PUBLIC_SITE_BASE}/musician/${musId}` : "");
          const img =
            typeof d?.photoUrl === "string" && d.photoUrl.startsWith("http")
              ? d.photoUrl
              : "";
          console.groupCollapsed(`🎵 Deputy #${i + 1} (musicianId: ${musId})`);
          console.log({
            vocalistName: d?.vocalistName || d?.name,
            musicianId: musId,
            photoUrl: img,
            profileUrl: profile,
            variantPassedToBadge: "deputy",
            setAt: d?.setAt,
          });
          console.groupEnd();
          return (
            <FeaturedVocalistBadge
              key={`dep-badge-${i}-${musId || "na"}`}
              imageUrl={img || undefined}
              pictureSource={d}
              variant="deputy"
              size={Math.round(size * 0.86)}
              cacheBuster={d?.setAt || cacheBuster || ""}
              musicianId={musId}
              profileUrl={profile}
            />
          );
        })}
      </div>
    );
    console.groupEnd();
    console.groupEnd();
    return deputiesDom;
  }

  // Branch 2: Lead badge (default)
  console.group("⭐ Lead badge branch");
  const leadMusId = String(badge?.musicianId || "");
  const leadProfile =
    (badge?.profileUrl && String(badge.profileUrl)) ||
    (leadMusId ? `${PUBLIC_SITE_BASE}/musician/${leadMusId}` : "");
  // Try both photoUrl and profilePicture as sources
  const leadImg =
    (typeof badge?.photoUrl === "string" && badge.photoUrl.startsWith("http"))
      ? badge.photoUrl
      : (typeof badge?.profilePicture === "string" && badge.profilePicture.startsWith("http"))
      ? badge.profilePicture
      : "";
  console.log("leadMusId:", leadMusId);
  console.log("leadProfile:", leadProfile);
  console.log("leadImg:", leadImg);
  if (!leadImg) {
    console.warn("❌ No valid lead image found – skipping render");
    console.groupEnd();
    console.groupEnd();
    return null;
  }
  console.log("Rendering FeaturedVocalistBadge with:", {
    imageUrl: leadImg,
    pictureSource: badge,
    variant: badge?.isDeputy ? "deputy" : "lead",
    size,
    cacheBuster: badge?.setAt || cacheBuster || "",
    className,
    musicianId: leadMusId,
    profileUrl: leadProfile,
  });
  const badgeDom = (
    <FeaturedVocalistBadge
      imageUrl={leadImg || undefined}
      pictureSource={badge}
      variant={badge?.isDeputy ? "deputy" : "lead"}
      size={size}
      cacheBuster={badge?.setAt || cacheBuster || ""}
      className={className}
      musicianId={leadMusId}
      profileUrl={leadProfile}
    />
  );
  console.groupEnd();
  console.groupEnd();
  return badgeDom;
}