import { assets } from "../assets/assets"; // top-level import
const PUBLIC_SITE_BASE =
  import.meta.env.FRONTEND_URL || window.location.origin; // fallback to current site origin

// Extract a valid http(s) URL from an object that may have profile fields.
const pickProfilePicture = (obj = {}) => {
  const v =
    obj && typeof obj.profilePicture === "string"
      ? obj.profilePicture.trim()
      : "";
  return v && v.startsWith("http") ? v : "";
};

// 🎨 FeaturedVocalistBadge — single circular badge renderer
export function FeaturedVocalistBadge({
  imageUrl,
  pictureSource = null,
  size = 140,
  photoScale = 0.74,
  photoOffsetY = -4,
  variant = "lead",
  cacheBuster = "",
  className = "",
  musicianId = "",
  profileUrl = "",
  actContext = null,
  dateContext = null,
}) {
  console.groupCollapsed(`🎨 [FeaturedVocalistBadge] BEGIN (variant: ${variant})`);
  console.log("🎨 [FV] Props received:", {
    imageUrl,
    pictureSource,
    musicianId,
    profileUrl,
  });
  console.log("🎨 [FV] Size/photoScale/photoOffsetY:", {
    size,
    photoScale,
    photoOffsetY,
  });
  console.log("🎨 [FV] PUBLIC_SITE_BASE:", PUBLIC_SITE_BASE);
  console.log("🎨 [FV] Context:", { actContext, dateContext });

  const inner = Math.round(size * photoScale);
  const ringSrc =
    variant === "deputy"
      ? assets.Deputy_Vocalist_Available
      : assets.Featured_Vocalist_Available;
  console.log("🎨 [FV] Ring image used:", ringSrc);

  const resolvedImageUrl = imageUrl || pickProfilePicture(pictureSource || {});
  console.log("🎨 [FV] resolvedImageUrl:", resolvedImageUrl);

  const hasValidUrl =
    typeof resolvedImageUrl === "string" &&
    resolvedImageUrl.trim().startsWith("http");
  console.log("🎨 [FV] hasValidUrl:", hasValidUrl);

  const imgSrc =
    hasValidUrl && cacheBuster
      ? `${resolvedImageUrl}${
          resolvedImageUrl.includes("?") ? "&" : "?"
        }v=${encodeURIComponent(cacheBuster)}`
      : hasValidUrl
      ? resolvedImageUrl
      : "";
  console.log("🎨 [FV] imgSrc:", imgSrc);

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
  console.log("🎨 [FV] effectiveProfileUrl:", effectiveProfileUrl);

  console.log("🎨 [FV] Rendering state summary:", {
    resolvedImageUrl,
    imgSrc,
    hasValidUrl,
    effectiveProfileUrl,
    ringSrc,
    inner,
  });

  // --- Render
console.log("🎨 [FV] ✅ Rendering badge DOM (image + ring)...");

const badgeDom = (
  
  <div
    className={`inline-flex flex-col items-center ${className}`}
    style={{
      width: size,
      zIndex: 50,
      minHeight: size, // ✅ ensures it doesn’t collapse visually
    }}
  >
    <div
      className="relative select-none"
      style={{
        width: size,
        height: size,
        minHeight: size,
        position: "relative",
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

  console.log("🎨 [FV] ✅ Rendered successfully with imgSrc:", imgSrc);
  console.groupEnd();
  return badgeDom;
}

// 🎤 VocalistFeaturedAvailable — wrapper for lead + deputies
export function VocalistFeaturedAvailable({
  badge = null,
  size = 140,
  cacheBuster = "",
  className = "",
  actContext = null,
  dateContext = null,
}) {
  console.group("🎤 [VocalistFeaturedAvailable] BEGIN");
  console.log("🎤 [VFA] Props:", {
    badge,
    size,
    cacheBuster,
    className,
    actContext,
    dateContext,
  });
  console.log("🎤 [VFA] PUBLIC_SITE_BASE:", PUBLIC_SITE_BASE);

  if (!badge) {
    console.log("🎤 [VFA] ❗ badge prop was falsy (undefined/null) from parent");
    console.group("🛑 [VFA] Badge Debug");
    console.warn("🎤 [VFA] ❌ No badge prop received – skipping render");
    console.log("🎤 [VFA] Context:", { actContext, dateContext });
    console.groupEnd();
    console.groupEnd();
    return null;
  }

  console.log("🎤 [VFA] Full badge object:", badge);
  if (!badge.photoUrl && !badge.profilePicture) {
    console.group("🛑 [VFA] Badge Debug");
    console.warn("🎤 [VFA] ❌ badge missing photoUrl/profilePicture", badge);
    console.groupEnd();
  }

const deputies = Array.isArray(badge.deputies) ? badge.deputies.slice(0, 3) : [];
const hasDeputies = Array.isArray(deputies) && deputies.length > 0;

  console.log("🎤 [VFA] Derived variables:", {
    deputies,
    hasDeputies,
    badgeActive: badge.active,
    badgeIsDeputy: badge.isDeputy,
  });

  // --- Deputies branch
if (!badge?.active && Array.isArray(deputies) && deputies.length > 0) {
      console.group("🎤 [VFA] 🎭 Deputies branch");
    console.log("🎤 [VFA] Rendering deputies...");
    const deputiesDom = (
      <div className={`flex gap-3 items-center ${className}`}>
        {Array.isArray(deputies) &&
  deputies.map((d, i) => {
          const musId = String(d?.musicianId || "");
          const profile =
            (d?.profileUrl && String(d.profileUrl)) ||
            (musId ? `${PUBLIC_SITE_BASE}/musician/${musId}` : "");
          const img =
            typeof d?.photoUrl === "string" && d.photoUrl.startsWith("http")
              ? d.photoUrl
              : "";
          if (!img && (!d?.profilePicture || !d?.profilePicture.startsWith("http"))) {
            console.group(`🛑 [VFA] Deputy #${i + 1} Debug`);
            console.warn("🎤 [VFA] ❌ Deputy badge missing photoUrl/profilePicture", d);
            console.groupEnd();
          }
          console.groupCollapsed(`🎤 [VFA] 🎵 Deputy #${i + 1}`);
          console.log({
            vocalistName: d?.vocalistName || d?.name,
            musicianId: musId,
            photoUrl: img,
            profileUrl: profile,
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
              actContext={actContext}
              dateContext={dateContext}
            />
          );
        })}
      </div>
    );
    console.groupEnd();
    console.groupEnd();
    console.log("🎤 [VFA] ✅ Rendered deputies successfully");
    return deputiesDom;
  }

  // --- Lead or Deputy-Lead branch
console.group("🎤 [VFA] ⭐ Lead/Deputy badge branch");

const leadMusId = String(badge?.musicianId || badge?.deputies?.[0]?.musicianId || "");
const leadProfile =
  (badge?.profileUrl && String(badge.profileUrl)) ||
  (leadMusId ? `${PUBLIC_SITE_BASE}/musician/${leadMusId}` : "") ||
  (badge?.deputies?.[0]?.profileUrl ?? "");

const leadImg =
  // ✅ 1. Direct badge photo
  (typeof badge?.photoUrl === "string" && badge.photoUrl.startsWith("http") && badge.photoUrl) ||
  // ✅ 2. Badge-level profilePicture
  (typeof badge?.profilePicture === "string" && badge.profilePicture.startsWith("http") && badge.profilePicture) ||
  // ✅ 3. Deputy photo fallback (from backend-resolved getDeputyDisplayBits)
  (badge?.deputies?.[0]?.photoUrl && badge.deputies[0].photoUrl.startsWith("http") && badge.deputies[0].photoUrl) ||
  // ✅ 4. Deputy profilePicture fallback
  (badge?.deputies?.[0]?.profilePicture && badge.deputies[0].profilePicture.startsWith("http") && badge.deputies[0].profilePicture) ||
  "";

if (!leadImg) {
  console.warn("🎤 [VFA] ❌ No valid image for lead/deputy badge; skipping render");
  console.table({
    badgePhotoUrl: badge?.photoUrl,
    badgeProfilePicture: badge?.profilePicture,
    deputyPhotoUrl: badge?.deputies?.[0]?.photoUrl,
    deputyProfilePicture: badge?.deputies?.[0]?.profilePicture,
    badge,
  });
  console.groupEnd();
  console.groupEnd();
  return null;
}

console.log("🎤 [VFA] Rendering FeaturedVocalistBadge with:", {
  imageUrl: leadImg,
  pictureSource: badge,
  variant: badge?.isDeputy ? "deputy" : "lead",
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
    actContext={actContext}
    dateContext={dateContext}
  />
);

console.log("🎤 [VFA] ✅ Rendered lead/deputy badge successfully");
console.groupEnd();
console.groupEnd();
return badgeDom;
}