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
  displayName = "",
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

      {displayName && (
        <div className="text-[14px] text-gray-900 font-medium mt-1">{displayName}</div>
      )}

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
// 🎤 SLOT-AWARE Vocalist Badge Wrapper (tolerant of both shapes)
export function VocalistFeaturedAvailable({
  badge,            // either the full badge { slots: [...] }
  slot: slotProp,   // OR pass a single slot directly
  slotIndex,        // used when a full badge is provided
  size = 140,
  cacheBuster = "",
  className = "",
}) {

  // If caller passed a slot explicitly, use it.
  let slot = slotProp || null;

  // If caller passed a full badge, pick the right slot by index.
  if (!slot && badge?.slots?.length) {
    const indexToUse = Number.isFinite(slotIndex) ? slotIndex : 0;
    slot = badge.slots.find((s) => s.slotIndex === indexToUse) ?? badge.slots[0];
  }

  // If caller actually passed a slot in the `badge` prop by mistake, accept it.
  if (!slot && badge && !badge?.slots && (badge.photoUrl || badge.musicianId)) {
    slot = badge;
  }

  // Prefer a covering deputy who replied "yes" and has a usable photo
  let renderData = slot;
  if (slot && Array.isArray(slot.deputies) && slot.deputies.length) {
    const covering = slot.deputies.find((d) => d?.state === "yes" && typeof d?.photoUrl === "string" && d.photoUrl.startsWith("http"));
    if (covering) {
      renderData = { ...covering, isDeputy: true };
    } else {
      // If lead has no photo but any deputy does, pick the first deputy with a photo to render something
      const firstWithPhoto = slot.deputies.find((d) => typeof d?.photoUrl === "string" && d.photoUrl.startsWith("http"));
      if (firstWithPhoto) {
        renderData = { ...firstWithPhoto, isDeputy: true };
      }
    }
  }

  // Resolve display name for badge text
  const shortDisplayName = (full) => {
    if (!full) return "";
    const cleaned = String(full).trim().replace(/\s+/g, " ");
    const parts = cleaned.split(" ");
    if (parts.length === 1) return parts[0];
    const first = parts[0];
    const last = parts[parts.length - 1].replace(/[^A-Za-zÀ-ÿ'-]/g, "");
    const initial = last ? last[0].toUpperCase() : "";
    return initial ? `${first} ${initial}` : first;
  };

  // Prefer broad key coverage: deputies often arrive with different field names
  const pickName = (obj) => {
    if (!obj || typeof obj !== "object") return "";

    // 1) Single-string candidates in priority order
    const singleKeys = [
      "displayName",
      "preferredName",
      "vocalistName",
      "depName",
      "deputyName",
      "musicianName",
      "fullName",
      "name",
    ];
    for (const k of singleKeys) {
      const v = obj?.[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }

    // 2) Common nested shapes
    const nested = obj?.musician || obj?.user || obj?.profile || null;
    if (nested) {
      const fromNested = pickName(nested);
      if (fromNested) return fromNested;
    }

    // 3) Split first/last fallbacks
    const fn = obj.firstName || obj.first_name || "";
    const ln = obj.lastName || obj.last_name || "";
    if ((fn && fn.trim()) || (ln && ln.trim())) {
      return `${(fn || "").trim()} ${(ln || "").trim()}`.trim();
    }

    return "";
  };

  // Try the chosen render target first, then the slot itself
  const rawName =
    pickName(renderData) ||
    pickName(slot) ||
    "";

  const displayName = shortDisplayName(rawName);

  if (!slot) {
 
    return null;
  }

  const { musicianId, photoUrl, profileUrl, isDeputy } = renderData || {};
  if (!photoUrl?.startsWith("http")) {
    return null;
  }



  return (
    <FeaturedVocalistBadge
      imageUrl={photoUrl}
      size={size}
      cacheBuster={cacheBuster}
      className={className}
      musicianId={String(musicianId || "")}
      profileUrl={profileUrl}
      variant={isDeputy ? "deputy" : "lead"}
      displayName={displayName}
    />
  );
}
