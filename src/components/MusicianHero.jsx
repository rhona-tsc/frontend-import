import React, { useState, useEffect, useMemo, memo } from "react";
import PropTypes from "prop-types";

const pickHeroImageFromMusician = (m) => {
  if (!m) return "";
  if (m.coverHeroImage) return m.coverHeroImage;
  if (m.profilePicture) return m.profilePicture;
  if (Array.isArray(m.additionalImages) && m.additionalImages[0]) return m.additionalImages[0];
  const wardrobes = [
    "digitalWardrobeBlackTie",
    "digitalWardrobeFormal",
    "digitalWardrobeSmartCasual",
    "digitalWardrobeSessionAllBlack",
  ];
  for (const key of wardrobes) {
    const arr = m[key];
    if (Array.isArray(arr) && arr.length && arr[0]) return arr[0];
  }
  return "";
};

const pickSubtitleFromMusician = (m) => {
  if (!m) return "";
  if (m.tagLine) return m.tagLine;
  if (Array.isArray(m.instrumentation) && m.instrumentation.length) {
    const instruments = m.instrumentation
      .map((i) => i?.instrument)
      .filter(Boolean)
      .slice(0, 4)
      .join(" • ");
    if (instruments) return instruments;
  }
  if (m.bio) {
    const t = String(m.bio);
    return t.length > 140 ? t.slice(0, 137) + "…" : t;
  }
  return "";
};

const MusicianHero = ({
  musicianId,
  musicians = [],
  hideHeart = true,
  actId,
  acts = [],
}) => {
  const [musician, setMusician] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const resolvedId = musicianId || actId || null;

  const resolvedList = useMemo(() => {
    const list = Array.isArray(musicians) && musicians.length ? musicians : acts;
    return Array.isArray(list) ? list : [];
  }, [musicians, acts]);

  // ✅ Unconditional memo hooks (safe even when musician is null)
  const heroImage = useMemo(() => pickHeroImageFromMusician(musician), [musician]);

  const title = useMemo(() => {
    if (musician?.firstName) {
      const lastInitial = musician?.lastName ? ` ${musician.lastName.charAt(0)}` : "";
      return `${musician.firstName}${lastInitial}`;
    }
    return musician?.stageName || "Musician";
  }, [musician?.firstName, musician?.lastName, musician?.stageName]);

  const subtitle = useMemo(() => pickSubtitleFromMusician(musician), [musician]);

  useEffect(() => {
    let mounted = true;

    const fromList =
      resolvedId &&
      Array.isArray(resolvedList) &&
      resolvedList.find((item) => String(item?._id) === String(resolvedId));

    if (fromList) {
      if (mounted) setMusician(fromList);
      return () => {
        mounted = false;
      };
    }

    const fetchMusician = async () => {
      if (!resolvedId) return;

      const base = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
      const urls = [
        `${base}/api/musician/profile/${resolvedId}`,
        `${base}/api/musicians/${resolvedId}`,
        `${base}/api/musician/${resolvedId}`,
        `${base}/api/musician/moderation/deputy/${resolvedId}`,
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) continue;

          const data = await res.json();
          const doc = data?.musician || data?.deputy || data?.act || data?.actData || data;

          if (doc && mounted) {
            setMusician(doc);
            return;
          }
        } catch {
          // try next
        }
      }

      console.error("❌ Failed to load musician: no matching endpoint for id", resolvedId);
    };

    fetchMusician();

    return () => {
      mounted = false;
    };
  }, [resolvedId, resolvedList]);

  // ✅ Conditional render AFTER hooks
  if (!musician) {
    return (
      <div className="relative w-full max-w-full">
        <div className="w-full aspect-video rounded-md bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-full">
      <div className="relative w-full aspect-video rounded-md overflow-hidden">
        {!isLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse z-10" />}

        {heroImage && (
          <img
            src={heroImage}
            alt={title ? `${title} hero` : "Musician hero"}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            loading="eager"
            decoding="async"
            fetchpriority="high"
            onLoad={() => setIsLoaded(true)}
          />
        )}

        {!hideHeart && (
          <div className="absolute top-4 left-4 p-2 z-30 opacity-60 pointer-events-none" />
        )}

        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-black bg-opacity-50 p-6 rounded text-center max-w-2xl text-white">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-snug">{title}</h1>
            {subtitle && (
              <div className="flex items-center gap-2 justify-center mt-4 text-sm tracking-wider">
                <span>{subtitle}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

MusicianHero.propTypes = {
  musicianId: PropTypes.string,
  musicians: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      firstName: PropTypes.string,
      lastName: PropTypes.string,
      tagLine: PropTypes.string,
      bio: PropTypes.string,
      profilePicture: PropTypes.string,
      additionalImages: PropTypes.arrayOf(PropTypes.string),
      instrumentation: PropTypes.arrayOf(
        PropTypes.shape({ instrument: PropTypes.string, skill_level: PropTypes.string })
      ),
      digitalWardrobeBlackTie: PropTypes.arrayOf(PropTypes.string),
      digitalWardrobeFormal: PropTypes.arrayOf(PropTypes.string),
      digitalWardrobeSmartCasual: PropTypes.arrayOf(PropTypes.string),
      digitalWardrobeSessionAllBlack: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  hideHeart: PropTypes.bool,
  actId: PropTypes.string,
  acts: PropTypes.array,
};

export default memo(MusicianHero);