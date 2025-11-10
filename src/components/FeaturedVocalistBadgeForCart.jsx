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

  if (!badge) {
    console.log("🎯 [BadgeDebug] No badge yet, skip enrich");
    return;
  }

  // 🧠 Helper: fetch a musician by ID
  const fetchMusicianById = async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/musician/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn("🎯 [BadgeDebug] Musician fetch failed:", id, err.message);
      return null;
    }
  };

  const enrichBadge = async () => {
    const leadId = badge.musicianId || badge.deputies?.[0]?.musicianId;
    const leadMusician = leadId ? await fetchMusicianById(leadId) : null;

    const enrichedDeps = Array.isArray(badge.deputies)
      ? await Promise.all(
          badge.deputies.map(async (dep) => {
            if (!dep?.musicianId) {
              console.warn("⚠️ Deputy missing musicianId:", dep?.name);
              return dep;
            }
            const m = await fetchMusicianById(dep.musicianId);
            if (!m) return dep;
            return {
              ...dep,
              photoUrl: m.profilePicture || m.photoUrl || dep.photoUrl,
              profileUrl: `${PUBLIC_SITE_BASE}/musician/${dep.musicianId}`,
            };
          })
        )
      : [];

    const newBadge = {
      ...badge,
      photoUrl:
        leadMusician?.profilePicture ||
        leadMusician?.photoUrl ||
        badge.photoUrl,
      profileUrl: leadId
        ? `${PUBLIC_SITE_BASE}/musician/${leadId}`
        : badge.profileUrl,
      musicianId: leadId,
      deputies: enrichedDeps,
    };

    console.log("🎯 [BadgeDebug] Enriched badge:", newBadge);

    setEnrichedBadge(newBadge);
  };

  enrichBadge();
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
      {profileUrl && (
  <a
    href={profileUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-[#ff6667] hover:underline mt-1"
  >
    View Profile
  </a>
)}
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

useEffect(() => {
  if (!resolvedBadge && actId && dateISO) {
    console.log("🎯 [BadgeDebug] Lazy badge fetch triggered:", { actId, dateISO });
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/availability/badge?actId=${actId}&date=${dateISO}`);
        const data = await res.json();
        if (data?.success && data.badge) {
          console.log("🎯 [BadgeDebug] Lazy badge loaded successfully:", data.badge);
          setResolvedBadge(data.badge);
        } else {
          console.warn("🎯 [BadgeDebug] No badge returned:", data);
        }
      } catch (err) {
        console.error("🎯 [BadgeDebug] Lazy badge fetch error:", err);
      }
    })();
  }
}, [actId, dateISO, resolvedBadge]);

const deputies = Array.isArray(resolvedBadge?.deputies)
  ? resolvedBadge.deputies.slice(0, 3)
  : [];
const hasDeputies = deputies.length > 0;

if (!resolvedBadge) {
  console.warn("🎯 [BadgeDebug] No resolvedBadge available yet");
  return null;
}

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