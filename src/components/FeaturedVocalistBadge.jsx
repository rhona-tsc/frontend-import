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

  const leadSlots = badge.slots.filter(s => !s.isDeputy && s.musicianId && s.photoUrl?.startsWith("http"));

  if (leadSlots.length <= 2) {
    console.log(`🎤 [VFA] ${leadSlots.length} lead vocalists found — rendering as leads`);
  }

  if (!leadSlots.length) {
    console.warn("🎤 [VFA] No valid lead vocalists in slots[], skipping");
    console.groupEnd();
    return null;
  }

  return (
    <div className={`flex gap-3 flex-wrap ${className}`}>
      {leadSlots.map(slot => {
        const musicianId = String(slot.musicianId || "");
        const photoUrl = String(slot.photoUrl || "");
        const setAt = slot.setAt;
        const isDeputy = slot.isDeputy;

        const image = (photoUrl && photoUrl.startsWith("http")) ? photoUrl : "";
        if (!musicianId || !image) return null;

        const resolvedProfile = slot.profileUrl?.startsWith("http")
          ? slot.profileUrl
          : `${window.location.origin}/musician/${musicianId}`;

        return (
          <>
            {/* ✅ Lead singers always render */}
            <FeaturedVocalistBadge
              key={`${badge.dateISO}_lead_${slot.slotIndex}`}
              imageUrl={image}
              size={140}
              cacheBuster={setAt || cacheBuster}
              className={className}
              musicianId={musicianId}
              profileUrl={resolvedProfile}
            />

            {/* ✅ Deputies render ONLY if a slot has deputies[] inside it */}
            {badge.slots?.[slot.slotIndex]?.deputies?.length > 0 && badge.slots[slot.slotIndex].deputies.map((dep,i) => {
              const depId = dep.musicianId && String(dep.musicianId);
              const depUrl = dep.photoUrl && String(dep.photoUrl);
              if (!depId || !depUrl?.startsWith("http")) return null;

              const depProfile = dep.profileUrl?.startsWith("http")
                ? dep.profileUrl
                : `${window.location.origin}/musician/${depId}`;

              return (
                <FeaturedVocalistBadge
                  key={`${badge.dateISO}_slot_${slot.slotIndex}_dep_${i}`}
                  imageUrl={depUrl}
                  size={120}
                  pictureSource={dep}
                  variant="deputy"
                  cacheBuster={dep.setAt || cacheBuster}
                  musicianId={depId}
                  profileUrl={depProfile}
                />
              );
            })}
          </>
        );
      })}
    </div>
  );
}
