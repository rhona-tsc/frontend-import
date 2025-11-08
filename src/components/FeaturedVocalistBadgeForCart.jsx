import React, { useEffect, useState } from "react";
import { assets } from "../assets/assets";

const PUBLIC_SITE_BASE = import.meta?.env?.FRONTEND_URL;
const BACKEND_URL =
  import.meta?.env?.VITE_BACKEND_URL || import.meta?.env?.BACKEND_URL;

const pickProfilePicture = (obj = {}) => {
  const v =
    obj && typeof obj.profilePicture === "string"
      ? obj.profilePicture.trim()
      : "";
  return v && v.startsWith("http") ? v : "";
};

// ---------------------------------------------------------------------------
// 🎨 Single badge
// ---------------------------------------------------------------------------
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
  console.log("🔥 FeaturedVocalistBadgeForCart mounted at runtime", {
  BACKEND_URL,
  PUBLIC_SITE_BASE,
});

  useEffect(() => {
    console.log("🎯 [BadgeDebug] useEffect → badge prop changed:", {
      badge,
      musicianId,
      pictureSource,
      BACKEND_URL,
    });

    const fetchMusician = async () => {
      if (!enrichedBadge) {
        console.log("🎯 [BadgeDebug] No badge yet, skip enrich");
        return;
      }
      if (enrichedBadge.photoUrl && enrichedBadge.musicianId) {
        console.log(
          "🎯 [BadgeDebug] Badge already has photo & ID, skipping enrich:",
          enrichedBadge
        );
        return;
      }

      try {
        const id =
          enrichedBadge.musicianId || enrichedBadge.deputies?.[0]?.musicianId;
        if (!id) {
          console.warn("🎯 [BadgeDebug] No musicianId found on badge", enrichedBadge);
          return;
        }

        console.log("🎯 [BadgeDebug] Fetching musician for badge", {
          id,
          url: `${BACKEND_URL}/api/musician/${id}`,
        });

        const res = await fetch(`${BACKEND_URL}/api/musician/${id}`);
        if (!res.ok) {
          console.warn(
            "🎯 [BadgeDebug] Musician fetch failed with status",
            res.status
          );
          return;
        }

        const musician = await res.json();
        console.log("🎯 [BadgeDebug] Musician fetched:", musician);

        setEnrichedBadge((prev) => ({
          ...prev,
          photoUrl:
            musician.profilePicture || musician.photoUrl || prev.photoUrl,
          profileUrl: `${PUBLIC_SITE_BASE}/musician/${id}`,
          musicianId: id,
        }));

        console.log("🎯 [BadgeDebug] Enriched badge on cart:", {
          firstName: musician.firstName,
          photo: musician.profilePicture,
        });
      } catch (err) {
        console.warn("🎯 [BadgeDebug] Failed to enrich badge:", err.message);
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
    imageUrl || pickProfilePicture(pictureSource || {}) || enrichedBadge?.photoUrl;

  const hasValidUrl =
    typeof resolvedImageUrl === "string" && resolvedImageUrl.startsWith("http");

  const imgSrc = hasValidUrl ? resolvedImageUrl : "";

  const initials =
    pictureSource?.vocalistName?.trim()?.slice(0, 2)?.toUpperCase() ||
    pictureSource?.name?.trim()?.slice(0, 2)?.toUpperCase() ||
    "V";

  const handleClick = () => {
    if (selectable && typeof onSelect === "function") {
      console.log("🎯 [BadgeDebug] onSelect clicked:", {
        musicianId,
        pictureSource,
      });
      onSelect(musicianId || pictureSource?.musicianId || null);
    }
  };

  console.log("🎯 [BadgeDebug] Render badge", {
    variant,
    imgSrc,
    initials,
    enrichedBadge,
  });

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
      <div className="relative select-none" style={{ width: size, height: size }}>
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

// ---------------------------------------------------------------------------
// 🎤 Wrapper — lead or deputy badges
// ---------------------------------------------------------------------------
export function VocalistFeaturedBadgeForCart({
  badge = null,
  size = 140,
  cacheBuster = "",
  className = "",
  actId = "",
  dateISO = "",
}) {
  const [resolvedBadge, setResolvedBadge] = useState(badge);

  useEffect(() => {
    console.log("🎯 [BadgeDebug] useEffect → actId/dateISO change:", {
      actId,
      dateISO,
      badge,
    });

    const fetchBadgeIfMissing = async () => {
      if (!resolvedBadge || resolvedBadge?.photoUrl || !actId || !dateISO) {
        console.log("🎯 [BadgeDebug] Skip rehydrate badge condition", {
          hasBadge: !!resolvedBadge,
          hasPhoto: !!resolvedBadge?.photoUrl,
          actId,
          dateISO,
        });
        return;
      }
      try {
        const url = `${BACKEND_URL}/api/availability/badge?actId=${actId}&date=${dateISO}`;
        console.log("🎯 [BadgeDebug] Fetching badge:", url);
        const res = await fetch(url);
        const data = await res.json();
        console.log("🎯 [BadgeDebug] Badge API response:", data);
        if (data.success && data.badge) {
          console.log("🎯 [BadgeDebug] Rehydrated badge:", data.badge);
          setResolvedBadge(data.badge);
        } else {
          console.warn("🎯 [BadgeDebug] No badge returned from API");
        }
      } catch (err) {
        console.warn("🎯 [BadgeDebug] Failed to fetch badge:", err.message);
      }
    };
    fetchBadgeIfMissing();
  }, [actId, dateISO, resolvedBadge]);

  console.log("🎯 [BadgeDebug] Render VocalistFeaturedBadgeForCart", {
    resolvedBadge,
    actId,
    dateISO,
  });

  if (!resolvedBadge) return null;

  const deputies = Array.isArray(resolvedBadge.deputies)
    ? resolvedBadge.deputies.slice(0, 3)
    : [];
  const hasDeputies = deputies.length > 0;

  if (!resolvedBadge.active && hasDeputies) {
    console.log("🎯 [BadgeDebug] Rendering deputy badges:", deputies);
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

  // Lead view
  const leadMusId = String(resolvedBadge?.musicianId || "");
  const leadProfile =
    resolvedBadge?.profileUrl ||
    (leadMusId ? `${PUBLIC_SITE_BASE}/musician/${leadMusId}` : "");
  const leadImg =
    typeof resolvedBadge?.photoUrl === "string" &&
    resolvedBadge.photoUrl.startsWith("http")
      ? resolvedBadge.photoUrl
      : "";

  console.log("🎯 [BadgeDebug] Rendering lead badge", {
    leadMusId,
    leadProfile,
    leadImg,
  });

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