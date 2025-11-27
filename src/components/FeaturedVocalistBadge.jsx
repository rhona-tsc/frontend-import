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
  console.group("🎤 SLOT AWARE COMPONENT");

  console.log("🐊 [VFA] Full badge received as prop:", JSON.parse(JSON.stringify(badge)));

  if (!badge?.slots?.length) {
    console.warn("🐊 [VFA] ❌ badge.slots[] is empty or missing");
    console.groupEnd();
    return null;
  }

  console.log("🐊 [VFA] badge.slots[] array exists:", badge.slots);

  console.log("🐊 [VFA] badge.slotIndex we are trying to match:", badge.slotIndex);

  const activeSlot = badge.slots.find(s => s.slotIndex === badge.slotIndex);
  console.log("🐊 [VFA] Slot matched using badge.slotIndex:", activeSlot);

  const leadSlots = badge.slots.filter(s => !s.isDeputy && s.musicianId && s.photoUrl?.startsWith("http"));
  console.log("🐊 [VFA] Lead slots detected (should be 1–2–3+ leads, not deputies):", leadSlots);

  const deputySlots = badge.slots.filter(s => s.isDeputy);
  console.log("🐊 [VFA] Deputy slots present in badge.slots[]:", deputySlots);

  badge.slots.forEach(s => {
    console.log(`🧩 [VFA] Slot index ${s.slotIndex} contents:`, {
      musicianId: s.musicianId,
      photoUrl: s.photoUrl,
      profileUrl: s.profileUrl,
      setAt: s.setAt,
      isDeputy: s.isDeputy,
      deputies: s.deputies
    });
  });

  console.groupEnd();

  // don't change the rest of your component render logic for now — logs only
  return (
    <div className={`flex gap-3 flex-wrap ${className}`}>
      {leadSlots.map(slot => (
        <FeaturedVocalistBadge
          key={`${badge.dateISO}_slot_${slot.slotIndex}`}
          imageUrl={slot.photoUrl}
          size={140}
          cacheBuster={slot.setAt || cacheBuster}
          musicianId={slot.musicianId}
          profileUrl={slot.profileUrl}
          className={className}
        />
      ))}
    </div>
  );
}
