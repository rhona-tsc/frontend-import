import { assets } from "../assets/assets";
const PUBLIC_SITE_BASE = import.meta?.env?.FRONTEND_URL;

// Utility
const pickProfilePicture = (obj = {}) => {
  const v = obj && typeof obj.profilePicture === "string" ? obj.profilePicture.trim() : "";
  return v && v.startsWith("http") ? v : "";
};

// 🎨 Single badge
export function FeaturedVocalistBadgeForCart({
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
  selectable = false,
  isSelected = false,
  onSelect = () => {},
}) {

  if (typeof assets.Featured_Vocalist_Available !== "string") {
  console.error("🚨 assets.Featured_Vocalist_Available should be a URL but got:", assets.Featured_Vocalist_Available);
}
if (typeof onSelect !== "function" && selectable) {
  console.error("🚨 onSelect is not a function:", onSelect);
}

  const inner = Math.round(size * photoScale);
  const ringSrc =
    variant === "deputy"
      ? assets.Deputy_Vocalist_Available
      : assets.Featured_Vocalist_Available;

  const resolvedImageUrl = imageUrl || pickProfilePicture(pictureSource || {});
  const hasValidUrl = typeof resolvedImageUrl === "string" && resolvedImageUrl.startsWith("http");
  const imgSrc = hasValidUrl ? resolvedImageUrl : "";

  const handleClick = () => {
    if (selectable && typeof onSelect === "function") {
      onSelect(musicianId || pictureSource?.musicianId || null);
    }
  };

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={handleClick}
      className={`inline-flex flex-col items-center transition-all duration-200 ${
        selectable
          ? `cursor-pointer ${isSelected ? "scale-105 ring-4 ring-[#ff6667]" : "hover:scale-105"}`
          : "cursor-default"
      } ${className}`}
      style={{ width: size }}
    >
      <div className="relative select-none" style={{ width: size, height: size }}>
        {imgSrc && (
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
          />
        )}
        <img
          src={ringSrc}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none"
          draggable={false}
        />
      </div>
      <p className="text-sm text-center mt-2 font-medium">
        {pictureSource?.vocalistName || "Vocalist"}
      </p>
    </button>
  );
}

// 🎤 Wrapper — shows lead badge or deputy badges
export function VocalistFeaturedBadgeForCart({
  badge = null,
  size = 140,
  cacheBuster = "",
  className = "",
}) {
  if (!badge) return null;

  const deputies = Array.isArray(badge.deputies) ? badge.deputies.slice(0, 3) : [];
  const hasDeputies = deputies.length > 0;

  // Deputies
  if (!badge.active && hasDeputies) {
    return (
      <div className={`flex gap-3 items-center ${className}`}>
        {deputies.map((d, i) => {
          const musId = String(d?.musicianId || "");
          const profile =
            (d?.profileUrl && String(d.profileUrl)) ||
            (musId ? `${PUBLIC_SITE_BASE}/musician/${musId}` : "");
          const img =
            typeof d?.photoUrl === "string" && d.photoUrl.startsWith("http") ? d.photoUrl : "";

          return (
            <FeaturedVocalistBadgeForCart
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
  }

  // Lead
  const leadMusId = String(badge?.musicianId || "");
  const leadProfile =
    (badge?.profileUrl && String(badge.profileUrl)) ||
    (leadMusId ? `${PUBLIC_SITE_BASE}/musician/${leadMusId}` : "");
  const leadImg =
    typeof badge?.photoUrl === "string" && badge.photoUrl.startsWith("http")
      ? badge.photoUrl
      : "";

  if (!leadImg && !badge?.profilePicture) return null;

  return (
    <FeaturedVocalistBadgeForCart
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
}