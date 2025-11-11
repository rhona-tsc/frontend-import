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

import { useState } from "react";

// 🎨 FeaturedVocalistBadge — single circular badge renderer
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
  actContext = null,
  dateContext = null,
  onSelect = null,
  isSelected = false,
}) {
  const [hover, setHover] = useState(false);

  const inner = Math.round(size * photoScale);
  const ringSrc =
    variant === "deputy"
      ? assets.Deputy_Vocalist_Available
      : assets.Featured_Vocalist_Available;

  const resolvedImageUrl = imageUrl || pickProfilePicture(pictureSource || {});
  const hasValidUrl =
    typeof resolvedImageUrl === "string" &&
    resolvedImageUrl.trim().startsWith("http");
  const imgSrc =
    hasValidUrl && cacheBuster
      ? `${resolvedImageUrl}${
          resolvedImageUrl.includes("?") ? "&" : "?"
        }v=${encodeURIComponent(cacheBuster)}`
      : resolvedImageUrl;

  const effectiveProfileUrl =
    profileUrl ||
    (musicianId ? `${PUBLIC_SITE_BASE}/musician/${musicianId}` : "");

const handleClick = () => {
  const id =
    musicianId ||
    pictureSource?.musicianId ||
    pictureSource?.resolvedMusicianId ||
    pictureSource?._id ||
    "";
  if (onSelect && id) onSelect(id);
};

console.log("🟢 Badge Click Bind:", {
  musicianId,
  resolvedFrom: pictureSource?.musicianId,
});

  // ✅ Grow effect but no circle outline
  const scaleClass = hover || isSelected ? "scale-105" : "scale-100";

  // Helper to get first name + initial of surname
  function getShortName(obj = {}) {
    const fullName =
      obj.vocalistName ||
      obj.name ||
      "";
    if (!fullName) return "";
    const parts = fullName.trim().split(" ");
    if (parts.length === 0) return "";
    const first = parts[0];
    const lastInitial = parts.length > 1 ? parts[1][0] : "";
    return lastInitial ? `${first} ${lastInitial}.` : first;
  }

  const vocalistDisplayName = getShortName(pictureSource || {});

  return (
    <div
      className={`inline-flex flex-col items-center ${className} cursor-pointer transition-transform duration-150`}
      style={{ width: size, zIndex: 50, minHeight: size }}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={`relative select-none rounded-md border border-gray-300 shadow-md hover:shadow-lg transition-all ${isSelected ? "brightness-110 border-[#ff6667]" : "border-gray-300"} ${scaleClass}`}
        style={{
          width: size,
          height: size,
          minHeight: size,
          position: "relative",
        }}
        aria-label="Vocalist featured & available"
      >
        {hasValidUrl && (
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
        )}
        <img
          src={ringSrc}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none"
          draggable={false}
        />
      </div>

      {vocalistDisplayName && (
        <div className="mt-2 text-[15px] font-semibold text-center w-full">{vocalistDisplayName}</div>
      )}

      {effectiveProfileUrl && (
        <a
          href={effectiveProfileUrl}
          className="text-[13px] text-[#ff6667] text-center w-full underline block"
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          View Profile
        </a>
      )}

      {/* Show tick icon below badge if selected */}
      {isSelected && (
        <div className="flex justify-center w-full mt-2">
          <img
            src={assets.tick}
            alt="Selected"
            style={{ width: 20, height: 20 }}
            className="mx-auto"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
