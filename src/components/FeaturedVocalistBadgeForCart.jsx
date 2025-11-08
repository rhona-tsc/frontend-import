import React, { useEffect, useState } from "react";
import { assets } from "../assets/assets";
const PUBLIC_SITE_BASE = import.meta?.env?.FRONTEND_URL;
const BACKEND_URL =
  import.meta?.env?.VITE_BACKEND_URL || import.meta?.env?.BACKEND_URL;

// Utility: pick valid image string
const pickProfilePicture = (obj = {}) => {
  const v =
    obj && typeof obj.profilePicture === "string"
      ? obj.profilePicture.trim()
      : "";
  return v && v.startsWith("http") ? v : "";
};

// 🎨 Single badge button
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
  selectable = false,
  isSelected = false,
  onSelect = () => {},
  badge = null,
}) {
  const [enrichedBadge, setEnrichedBadge] = useState(badge);

  // ✅ Enrich missing musician data
  useEffect(() => {
    const fetchMusician = async () => {
      if (!enrichedBadge) return;
      if (enrichedBadge.photoUrl && enrichedBadge.musicianId) return;

      try {
        const id = enrichedBadge.musicianId || enrichedBadge.deputies?.[0]?.musicianId;
        if (!id) return;

        const res = await fetch(`${BACKEND_URL}/api/musician/${id}`);
        if (!res.ok) return;
        const musician = await res.json();

        setEnrichedBadge((prev) => ({
          ...prev,
          photoUrl: musician.profilePicture || musician.photoUrl || prev.photoUrl,
          profileUrl: `${PUBLIC_SITE_BASE}/musician/${id}`,
          musicianId: id,
        }));

        console.log("🎨 Enriched badge on cart:", musician.firstName, musician.profilePicture);
      } catch (err) {
        console.warn("⚠️ Failed to enrich badge:", err.message);
      }
    };

    fetchMusician();
  }, [badge]);

  const inner = Math.round(size * photoScale);
  const ringSrc =
    variant === "deputy"
      ? assets.Deputy_Vocalist_Available
      : assets.Featured_Vocalist_Available;

const resolvedImageUrl =
   imageUrl ||
   pickProfilePicture(pictureSource || {}) ||
   enrichedBadge?.photoUrl;

 const hasValidUrl =
   typeof resolvedImageUrl === "string" && resolvedImageUrl.startsWith("http");

 const imgSrc = hasValidUrl ? resolvedImageUrl : "";

  const initials =
    pictureSource?.vocalistName?.trim()?.slice(0, 2)?.toUpperCase() ||
    pictureSource?.name?.trim()?.slice(0, 2)?.toUpperCase() ||
    "V";

  const handleClick = () => {
    if (selectable && typeof onSelect === "function") {
      onSelect(musicianId || pictureSource?.musicianId || null);
    }
  };

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={handleClick}
      className={`inline-flex flex-col items-center transition-all duration-200 ${
        selectable
          ? `cursor-pointer ${
              isSelected ? "scale-105 ring-4 ring-[#ff6667]" : "hover:scale-105"
            }`
          : "cursor-default"
      } ${className}`}
      style={{ width: size }}
    >
      <div
        className="relative select-none"
        style={{ width: size, height: size }}
      >
        {/* 🧩 Fallback initials if no image */}
        {!imgSrc && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-700 text-xl font-bold rounded-full shadow-sm"
            style={{
              width: inner,
              height: inner,
              left: "50%",
              top: "50%",
              transform: `translate(-50%, calc(-50% + ${photoOffsetY}px))`,
            }}
          >
            {initials}
          </div>
        )}

        {/* 🎨 Actual image if available */}
        {imgSrc && (
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
          />
        )}

        <img
          src={ringSrc}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none"
          draggable={false}
        />
      </div>
      <p className="text-sm text-center mt-2 font-medium">
        {pictureSource?.vocalistName || pictureSource?.name || "Vocalist"}
      </p>
    </button>
  );
}

// 🎤 Wrapper — lead or deputy badges
export function VocalistFeaturedBadgeForCart({
  badge = null,
  size = 140,
  cacheBuster = "",
  className = "",
  actId = "",
  dateISO = "",
}) {
  const [resolvedBadge, setResolvedBadge] = useState(badge);

  // 🧠 Auto-fetch badge if missing photoUrl
  useEffect(() => {
    const fetchBadgeIfMissing = async () => {
      if (!resolvedBadge || resolvedBadge?.photoUrl || !actId || !dateISO) return;
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/availability/badge?actId=${actId}&date=${dateISO}`
        );
        const data = await res.json();
        if (data.success && data.badge) {
          console.log("🔄 Rehydrated badge with photoUrl:", data.badge);
          setResolvedBadge(data.badge);
        }
      } catch (err) {
        console.warn("⚠️ Failed to fetch badge:", err.message);
      }
    };
    fetchBadgeIfMissing();
  }, [actId, dateISO, resolvedBadge]);

  if (!resolvedBadge) return null;

  const deputies = Array.isArray(resolvedBadge.deputies)
    ? resolvedBadge.deputies.slice(0, 3)
    : [];
  const hasDeputies = deputies.length > 0;

  // 🧩 Deputies view
  if (!resolvedBadge.active && hasDeputies) {
    return (
      <div className={`flex gap-3 items-center ${className}`}>
        {deputies.map((d, i) => {
          const musId = String(d?.musicianId || "");
          const profile =
            d?.profileUrl ||
            (musId ? `${PUBLIC_SITE_BASE}/musician/${musId}` : "");
          const img =
            typeof d?.photoUrl === "string" && d.photoUrl.startsWith("http")
              ? d.photoUrl
              : "";

          return (
            <FeaturedVocalistBadgeForCart
              key={`dep-badge-${i}-${musId || "na"}`}
              imageUrl={img || undefined}
              pictureSource={d}
              variant="deputy"
              size={Math.round(size * 0.86)}
              cacheBuster={d?.setAt || cacheBuster || ""}
              musicianId={musId}
              profileUrl={profile}
            />
          );
        })}
      </div>
    );
  }

  // 🧩 Lead vocalist view
  const leadMusId = String(resolvedBadge?.musicianId || "");
  const leadProfile =
    resolvedBadge?.profileUrl ||
    (leadMusId ? `${PUBLIC_SITE_BASE}/musician/${leadMusId}` : "");
  const leadImg =
    typeof resolvedBadge?.photoUrl === "string" &&
    resolvedBadge.photoUrl.startsWith("http")
      ? resolvedBadge.photoUrl
      : "";

  return (
    <FeaturedVocalistBadgeForCart
      imageUrl={leadImg || undefined}
      pictureSource={resolvedBadge}
      variant={resolvedBadge?.isDeputy ? "deputy" : "lead"}
      size={size}
      cacheBuster={resolvedBadge?.setAt || cacheBuster || ""}
      className={className}
      musicianId={leadMusId}
      profileUrl={leadProfile}
    />
  );
}