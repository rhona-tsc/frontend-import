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
  onSelect = null, // ✅ new prop
  isSelected = false, // ✅ new prop
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

  // ✅ Add subtle highlight on hover or if selected
  const outlineColor = isSelected
    ? "outline-4 outline-[#ff6667]"
    : hover
    ? "outline-2 outline-gray-400"
    : "outline-0";

  const handleClick = () => {
    if (onSelect) onSelect(musicianId);
  };

  return (
    <div
      className={`inline-flex flex-col items-center ${className} cursor-pointer transition-all duration-150`}
      style={{ width: size, zIndex: 50, minHeight: size }}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={`relative select-none rounded-full outline ${outlineColor}`}
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
          onClick={(e) => e.stopPropagation()} // ✅ prevent badge click triggering
        >
          View Profile
        </a>
      )}
    </div>
  );
}
