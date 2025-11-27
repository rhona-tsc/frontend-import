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
export function VocalistFeaturedAvailable({ badge, size = 140, cacheBuster = "", className = "", slotIndex }) {
  console.group("🎤 SLOT AWARE COMPONENT");
  console.log("🐊 [VFA] Badge received:", JSON.parse(JSON.stringify(badge)));

  if (!badge?.slots?.length) {
    console.warn("🐊 [VFA] ❌ No slots[] array in badge!");
    console.groupEnd();
    return null;
  }

  console.log("🐊 [VFA] badge.slots[] exists:", badge.slots);

  // ✅ If parent passed `slotIndex` separately, use it — otherwise fallback to 0
  const indexToUse = Number.isFinite(slotIndex) ? slotIndex : 0;
  console.log("🐊 [VFA] slotIndex we will use:", indexToUse);

  const slot = badge.slots.find(s => s.slotIndex === indexToUse);
  console.log("🐊 [VFA] Active slot found:", slot);

  if (!slot?.musicianId || !slot?.photoUrl?.startsWith("http")) {
    console.warn("🐊 [VFA] ❌ Active slot missing singer data, skipping");
    console.groupEnd();
    return null;
  }

  const musicianId = String(slot.musicianId);
  const photoUrl = String(slot.photoUrl);

  console.log("🐊 [VFA] Singer slot VALID ✅ → rendering", { slotIndex: indexToUse, musicianId, photoUrl });

  console.groupEnd();
  return (
    <FeaturedVocalistBadge
      imageUrl={photoUrl}
      size={size}
      cacheBuster={cacheBuster}
      className={className}
      musicianId={musicianId}
      profileUrl={slot.profileUrl}
    />
  );
}
