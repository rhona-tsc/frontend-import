import { useState } from "react";
import { assets } from "../assets/assets";

// Extract a valid http(s) URL from an object that may have profile fields.
const pickProfilePicture = (obj = {}) => {
  if (!obj || typeof obj !== "object") return "";

  const direct =
    obj.profilePhoto ||
    obj.profilePicture ||
    obj.photoUrl ||
    obj.imageUrl ||
    "";

  if (typeof direct === "string" && direct.trim().startsWith("http")) {
    return direct.trim();
  }

  const arrayUrl =
    (Array.isArray(obj.profileImage) && obj.profileImage[0]?.url) ||
    (Array.isArray(obj.images) && obj.images[0]?.url) ||
    (Array.isArray(obj.coverImage) && obj.coverImage[0]?.url) ||
    "";

  return typeof arrayUrl === "string" && arrayUrl.trim().startsWith("http")
    ? arrayUrl.trim()
    : "";
};

const DEFAULT_PUBLIC_SITE_BASE = "https://www.thesupremecollective.co.uk";

const PUBLIC_SITE_BASE = (() => {
  const raw =
    import.meta.env.VITE_PUBLIC_SITE_BASE ||
    import.meta.env.VITE_FRONTEND_URL ||
    "";
  const fromEnv = typeof raw === "string" ? raw.trim() : "";

  if (fromEnv.startsWith("http")) return fromEnv.replace(/\/+$/, "");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (/\/\/(admin|api)\./.test(origin)) return DEFAULT_PUBLIC_SITE_BASE;

  return (origin || DEFAULT_PUBLIC_SITE_BASE).replace(/\/+$/, "");
})();

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
  disabled = false,          // 👈 NEW
}) {
  const [hover, setHover] = useState(false);

  const inner = Math.round(size * photoScale);
  const ringSrc = variant === "deputy"
    ? assets.Deputy_Vocalist_Available
    : assets.Featured_Vocalist_Available;

  const resolvedImageUrl = imageUrl || pickProfilePicture(pictureSource || {});
  const hasValidUrl = typeof resolvedImageUrl === "string" && resolvedImageUrl.trim().startsWith("http");
  const imgSrc = hasValidUrl && cacheBuster
    ? `${resolvedImageUrl}${resolvedImageUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(cacheBuster)}`
    : resolvedImageUrl;

const resolvedMusicianId =
  musicianId ||
  pictureSource?.musicianId ||
  pictureSource?.resolvedMusicianId ||
  pictureSource?._id ||
  "";

const effectiveProfileUrl =
  profileUrl ||
  pictureSource?.profileUrl ||
  (resolvedMusicianId
    ? `${PUBLIC_SITE_BASE}/musician/${encodeURIComponent(resolvedMusicianId)}`
    : "");

  const handleClick = () => {
    if (disabled) return;
    if (onSelect && resolvedMusicianId) onSelect(resolvedMusicianId);
  };

  const scaleClass = hover || isSelected ? "scale-105" : "scale-100";
  const cursorClass = disabled ? "cursor-not-allowed opacity-70" : (onSelect ? "cursor-pointer" : "cursor-default");

  const getShortName = (obj = {}) => {
    const fullName =
      obj.displayName ||
      obj.vocalistName ||
      obj.musicianName ||
      obj.name ||
      [obj.firstName, obj.lastName].filter(Boolean).join(" ") ||
      "";

    if (!fullName) return "";

    const parts = String(fullName).trim().split(/\s+/);
    const first = parts[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    const lastInitial = last ? last[0] : "";

    return lastInitial ? `${first} ${lastInitial}.` : first;
  };
  const vocalistDisplayName = getShortName(pictureSource || {});

  return (
    <div
      className={`inline-flex flex-col items-center ${className} ${cursorClass} transition-transform duration-150`}
      style={{ width: size, zIndex: 50, minHeight: size }}
      onClick={onSelect && !disabled ? handleClick : undefined}
      onMouseEnter={!disabled && onSelect ? () => setHover(true) : undefined}
      onMouseLeave={!disabled && onSelect ? () => setHover(false) : undefined}
      role={onSelect ? "button" : undefined}
      aria-pressed={onSelect ? isSelected : undefined}
      aria-disabled={disabled || undefined}
      title={disabled ? "Featured vocalist (required)" : undefined}
    >
      <div
        className={`relative select-none rounded-md border-2 shadow-md hover:shadow-lg p-4 transition-all
          ${isSelected ? "brightness-110 border-[#ff6667] shadow-lg bg-gray-300" : "border-gray-300 bg-white"}
          ${scaleClass}`}
        style={{ width: size, height: size, minHeight: size, position: "relative" }}
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
        <div className="mt-2 text-[15px] font-semibold text-center w-full">
          {vocalistDisplayName}{disabled ? " (featured)" : ""}
        </div>
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

      {isSelected && (
        <div className="flex justify-center w-full mt-2">
          <img src={assets.tick} alt="Selected" style={{ width: 20, height: 20 }} className="mx-auto" draggable={false} />
        </div>
      )}
    </div>
  );
}
