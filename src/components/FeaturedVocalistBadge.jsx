import { assets } from "../assets/assets"; // top-level import
const PUBLIC_SITE_BASE =
  import.meta.env.FRONTEND_URL || window.location.origin; // fallback to current site origin

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
}) {
  const inner = Math.round(size * photoScale);
  const ringSrc =
    variant === "deputy"
      ? assets.Deputy_Vocalist_Available
      : assets.Featured_Vocalist_Available;

  const imgSrc =
    imageUrl && cacheBuster
      ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${cacheBuster}`
      : imageUrl;

  const resolvedProfile =
    profileUrl ||
    (musicianId ? `${window.location.origin}/musician/${musicianId}` : "");

  return (
    <div
      className={`inline-flex flex-col items-center ${className}`}
      style={{ width: size, minHeight: size }}
    >
      <div
        className="relative select-none"
        style={{ width: size, height: size }}
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

      {resolvedProfile && (
        <a
          href={resolvedProfile}
          className="text-[14px] text-blue-600 underline block mt-1"
          target="_blank"
          rel="noreferrer"
        >
          View Profile
        </a>
      )}
    </div>
  );
}

// 🎤 SLOT-AWARE Vocalist Badge Wrapper
export function VocalistFeaturedAvailable({ badge, size = 140, cacheBuster = "", className = "" }) {
  console.group("🎤 [VFA] BEGIN (slot-aware)");
  console.log("🎤 [VFA] Incoming merged badge:", badge);

  if (!badge?.slots?.length) {
    console.warn("🎤 [VFA] No slots in badge — nothing to render");
    console.groupEnd();
    return null;
  }

  // ✅ Pull the correct active slot
  const slot = badge.slots.find(s => s.slotIndex === badge.slotIndex);
  if (!slot) {
    console.warn("🎤 [VFA] No matching slot entry for slotIndex:", badge.slotIndex);
    console.groupEnd();
    return null;
  }

  const musicianId = String(slot.musicianId || "");
  const photoUrl = String(slot.photoUrl || "");
  const setAt = slot.setAt;
  const isDeputy = slot.isDeputy;

  const image = (photoUrl && photoUrl.startsWith("http")) ? photoUrl : "";

  if (!musicianId || !image) {
    console.warn("🎤 [VFA] Missing musicianId or photoUrl in ACTIVE SLOT, skipping render");
    console.groupEnd();
    return null;
  }

  console.log("🎤 [VFA] Rendering vocalist badge from ACTIVE SLOT:", {
    musicianId,
    image,
    isDeputy,
    setAt
  });

  const resolvedProfile = badge.profileUrl?.startsWith("http")
    ? badge.profileUrl
    : `${window.location.origin}/musician/${musicianId}`;

  const variant = isDeputy ? "deputy" : "lead";

  const dom = (
    <FeaturedVocalistBadge
      imageUrl={image}
      size={size}
      cacheBuster={setAt || cacheBuster}
      className={className}
      musicianId={musicianId}
      profileUrl={resolvedProfile}
    />
  );

  console.groupEnd();
  return dom;
}
