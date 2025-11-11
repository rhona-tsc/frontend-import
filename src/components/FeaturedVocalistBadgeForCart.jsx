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
    if (onSelect) onSelect(musicianId);
  };

  // ✅ Grow effect but no circle outline
  const scaleClass = hover || isSelected ? "scale-105" : "scale-100";

  return (
    <div
      className={`inline-flex flex-col items-start ${className} cursor-pointer transition-transform duration-150 ${scaleClass}`}
      style={{ width: size, zIndex: 50, minHeight: size }}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="relative select-none rounded-full"
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

      {effectiveProfileUrl && (
        <a
          href={effectiveProfileUrl}
          className="text-[14px] text-blue-600 underline block mt-1"
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          View Profile
        </a>
      )}
    </div>
  );
}