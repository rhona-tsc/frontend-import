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
export function VocalistFeaturedAvailable({
  badge,
  size = 140,
  cacheBuster = "",
  className = "",
  actContext = null,
  dateContext = null
}) {
  console.group("🎤 [VFA] BEGIN (slot-aware)");
  console.log("🎤 [VFA] Incoming merged badge:", badge);

  if (!badge) {
    console.warn("🎤 [VFA] No badge provided — nothing to render");
    console.groupEnd();
    return null;
  }

  // ————————————————————————————————
  // Extract slot fields ONLY
  // ————————————————————————————————
  const {
    musicianId,
    photoUrl,
    profileUrl,
    isDeputy,
    setAt
  } = badge;

  const deputies = Array.isArray(badge.deputies) ? badge.deputies : [];

  // 🔥 Deputies branch — when multiple deputies reply
  if (Array.isArray(deputies) && deputies.length > 0 && !musicianId) {
    return (
      <div className={`flex gap-3 flex-wrap ${className}`}>
        {deputies.map((d, i) => {
          const depId = d.musicianId ? String(d.musicianId) : "";
          const depImg =
            d.photoUrl && d.photoUrl.startsWith("http") ? d.photoUrl : "";
          const depProfile =
            d.profileUrl && d.profileUrl.startsWith("http")
              ? d.profileUrl
              : `${window.location.origin}/musician/${depId}`;

          if (!depId || !depImg) return null;

          return (
            <FeaturedVocalistBadge
              key={`deputy-${i}-${depId}`}
              imageUrl={depImg}
              pictureSource={d}
              variant="deputy"
              size={Math.round(size * 0.86)}
              cacheBuster={d.setAt || cacheBuster}
              className={className}
              musicianId={depId}
              profileUrl={depProfile}
              actContext={actContext}
              dateContext={dateContext}
            />
          );
        })}
      </div>
    );
  }

  const image = (photoUrl && photoUrl.startsWith("http")) ? photoUrl : "";

  if (!musicianId || !image) {
    console.warn("🎤 [VFA] Missing musicianId or photoUrl, skipping render:", {
      musicianId,
      photoUrl
    });
    console.groupEnd();
    return null;
  }

  console.log("🎤 [VFA] Rendering vocalist badge:", {
    musicianId,
    image,
    isDeputy,
    setAt
  });

  const resolvedProfile =
    profileUrl && profileUrl.startsWith("http")
      ? profileUrl
      : `${window.location.origin}/musician/${musicianId}`;

  const variant = isDeputy ? "deputy" : "lead";

  const dom = (
    <FeaturedVocalistBadge
      imageUrl={image}
      pictureSource={badge}
      variant={variant}
      size={size}
      cacheBuster={setAt || cacheBuster || ""}
      className={className}
      musicianId={musicianId}
      profileUrl={resolvedProfile}
      actContext={actContext}
      dateContext={dateContext}
    />
  );

  console.groupEnd();
  return dom;
}

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