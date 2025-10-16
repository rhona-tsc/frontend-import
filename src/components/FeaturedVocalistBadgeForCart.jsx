
import { assets } from "../assets/assets"; // top-level import
const PUBLIC_SITE_BASE = (import.meta?.env?.FRONTEND_URL);

// Extract a valid http(s) URL from an object that may have profile fields.
// We ONLY accept `profilePicture` (string URL). Anything else is ignored.
const pickProfilePicture = (obj = {}) => {
  const v = obj && typeof obj.profilePicture === "string" ? obj.profilePicture.trim() : "";
  return v && v.startsWith("http") ? v : "";
};

// Reusable badge: crops a circular performer photo and overlays the ring+ribbon
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
  selectable = false,           // NEW
  isSelected = false,           // NEW
  onSelect = () => {},          // NEW
}) {
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
export function VocalistFeaturedBadgeForCart({
  badge = null,
  size = 140,
  cacheBuster = "",
  className = "",
}) {
  if (!badge) return null;

  const deputies = Array.isArray(badge.deputies) ? badge.deputies.slice(0, 3) : [];
  const hasDeputies = deputies.length > 0;

  // If the lead isn't available/active but we have deputies → render up to 3 deputies
  if (!badge.active && hasDeputies) {
    return (
      <div className={`flex gap-3 items-center ${className}`}>
        {deputies.map((d, i) => {
          const musId = String(d?.musicianId || "");
          const profile =
            (d?.profileUrl && String(d.profileUrl)) ||
            (musId ? `${PUBLIC_SITE_BASE}/musician/${musId}` : "");

          // prefer an explicit deputy photoUrl; else FeaturedVocalistBadge falls back to d.profilePicture
          const img =
            typeof d?.photoUrl === "string" && d.photoUrl.startsWith("http")
              ? d.photoUrl
              : "";

          return (
            <VocalistFeaturedBadgeForCart
              key={`dep-badge-${i}-${musId || "na"}`}
              imageUrl={img || undefined}
              pictureSource={d}
              variant="deputy"
              size={Math.round(size * 0.86)}            // make deputies slightly smaller
              cacheBuster={d?.setAt || cacheBuster || ""}
              musicianId={musId}
              profileUrl={profile}
            />
          );
        })}
      </div>
    );
  }

  // Otherwise show the single lead badge (when active)
  const leadMusId = String(badge?.musicianId || "");
  const leadProfile =
    (badge?.profileUrl && String(badge.profileUrl)) ||
    (leadMusId ? `${PUBLIC_SITE_BASE}/musician/${leadMusId}` : "");
  const leadImg =
    typeof badge?.photoUrl === "string" && badge.photoUrl.startsWith("http")
      ? badge.photoUrl
      : "";

  // If we have no image nor profilePicture to render, show nothing
  if (!leadImg && !badge?.profilePicture) return null;

  return (
    <VocalistFeaturedBadgeForCart
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