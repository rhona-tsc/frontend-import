import React, { useState, useContext, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { assets } from '../assets/assets';
import { ShopContext } from '../context/ShopContext';
import calculateActPricing from '../pages/utils/pricing';
import useOnScreen from '../hooks/useOnScreen';
import { priceCache, makePriceKey } from './utils/priceCache';

const ShortlistItem = ({
  id,
  actData,
  images,
  tscName,
  onShortlistToggle,
  shortlistCount,
  userId, 
  _id,
  profileImage,
  className,
  onMouseEnter,
  isShortlisted,
  
}) => {

  const cardRef = React.useRef(null);
  const isOnScreen = useOnScreen(cardRef);
  const location = useLocation();

  const [isAnimating, setIsAnimating] = useState(false);
  const [price, setPrice] = useState(null);

const getEngagement = (act, fallback) => {
  const n = act?.timesShortlisted ?? fallback ?? 0;
  return Math.max(0, Number(n) || 0);
};

const [loveCount, setLoveCount] = useState(() => getEngagement(actData, shortlistCount));

useEffect(() => {
  setLoveCount(getEngagement(actData, shortlistCount));
}, [actData?.timesShortlisted, shortlistCount]);
  const { shortlistAct, shortlistedActs, selectedCounty, selectedAddress, selectedDate, triggerSearch, openSaveShortlistGate } = useContext(ShopContext);

  // ✅ One source of truth for the act id (some parents pass `id`, others rely on `actData._id`)
  const actId =
    id ||
    _id ||
    actData?._id ||
    actData?.id ||
    actData?.actId ||
    null;

  // ✅ One source of truth for whether this card is shortlisted
  const heartOn =
    typeof isShortlisted === "boolean"
      ? isShortlisted
      : !!(actId && shortlistedActs?.includes(String(actId)));
  
  const parseMoney = (v) => {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = Number(String(v).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const getBasePrice = (act) => {
    const lineup = act?.lineups?.[0] || null;

    // Prefer the marketing "from" price computed/stored on the act
    const base =
      parseMoney(act?.minDisplayPrice) ??
      parseMoney(act?.formattedPrice?.total) ??
      parseMoney(act?.formattedPrice?.from) ??
      parseMoney(lineup?.base_fee?.[0]?.total_fee) ??
      null;

    return base;
  };

useEffect(() => {
  // 0) If we don't have lineups yet, show base if possible and bail
  if (!actData?.lineups?.length) {
    const base = getBasePrice(actData);
    if (base != null) setPrice({ total: base, travelCalculated: false });
    return;
  }

  // 1) If no date or no location/county, show base and bail (no heavy calc)
  const hasAnyLocation = !!(selectedAddress || selectedCounty);
  if (!selectedDate || !hasAnyLocation) {
    const base = getBasePrice(actData);
    if (base != null) setPrice({ total: base, travelCalculated: false });
    return;
  }

  // 2) Only calculate when the card is on-screen
  if (!isOnScreen) return;

  const lineup = actData.lineups[0];
  const hasCountyTable =
    actData.useCountyTravelFee &&
    actData.countyFees &&
    Object.keys(actData.countyFees).length > 0;

  const key = makePriceKey({
    actId: actId || actData?._id,
    lineupId: lineup?._id || lineup?.lineupId,
    dateISO: selectedDate,
    address: selectedAddress || '',
    county: hasCountyTable ? selectedCounty : '',
  });

  // 3) Serve from cache if present
  const cached = priceCache.get(key);
  if (cached) {
    setPrice(cached);
    return;
  }

  // 4) Defer heavy work slightly so initial paint is smooth
  const schedule = window.requestIdleCallback
    ? (fn) => requestIdleCallback(fn, { timeout: 1000 })
    : (fn) => setTimeout(fn, 0);

  schedule(async () => {
    try {
      const result = await calculateActPricing(
        actData,
        hasCountyTable ? selectedCounty : null, // only pass county if valid
        selectedAddress,
        selectedDate,
        lineup
      );

      const base = getBasePrice(actData);
      const final =
        result && result.total != null
          ? result
          : base != null
          ? { total: base, travelCalculated: false }
          : null;

      if (final) {
        priceCache.set(key, final);
        setPrice(final);
      }
    } catch (err) {
      console.error('❌ Failed to calculate price:', { err, actId: actData?._id, useCountyTravelFee: actData?.useCountyTravelFee });
      const base = getBasePrice(actData);
      if (base != null) setPrice({ total: base, travelCalculated: false });
    }
  });
}, [
  actData?._id,
  actData?.lineups?.length,
  actData?.useCountyTravelFee,
  actData?.countyFees && Object.keys(actData.countyFees).length,
  selectedCounty,
  selectedAddress,
  selectedDate,
  isOnScreen,
]);

  const handleHeartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const resolved = actId || actData?._id;
    if (!resolved) {
      console.warn("⚠️ No actId available for shortlist toggle", { id, _id, actData });
      return;
    }

    try {
      const returnTo = `${actPath}${location.search || ''}`;
      sessionStorage.setItem('pendingShortlistReturnTo', returnTo);
      sessionStorage.setItem('postLoginNext', returnTo);
      sessionStorage.setItem('pendingShortlistActId', String(resolved));
      sessionStorage.setItem(
        'pendingShortlistActName',
        actData?.tscName || actData?.name || tscName || 'Act'
      );
    } catch {}

setLoveCount((prev) => {
  const safe = Number(prev) || 0;
  return heartOn ? Math.max(0, safe - 1) : safe + 1;
});
    setIsAnimating(true);
    if (typeof onShortlistToggle === 'function') {
      onShortlistToggle(resolved);
    } else {
      shortlistAct?.(null, resolved);
    }
    setTimeout(() => setIsAnimating(false), 300);
  };

  const formatLoveCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return count;
  };

  // --- Video carousel state and logic ---
  const [videoIndex, setVideoIndex] = useState(0);
  // Support both tscVideos from actData or fallback to empty array
  const tscVideos = (actData && actData.tscVideos) || [];

  // New state for play/pause
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePrevVideo = () => {
    setVideoIndex((prev) => (prev - 1 + tscVideos.length) % tscVideos.length);
    setIsPlaying(false);
  };

  const handleNextVideo = () => {
    setVideoIndex((prev) => (prev + 1) % tscVideos.length);
    setIsPlaying(false);
  };



  // Helper to extract YouTube video ID from URL or ID
  const extractVideoId = (url) => {
    if (!url) return "";
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : url;
  };

  // Debug logging for actId and isShortlisted
  console.log("❤️ actId in ShortlistItem:", actId, "Shortlisted?", heartOn);

  // Prefer slug URLs (SEO-friendly). Fall back safely.
  const slugify = (s = "") =>
    String(s || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const actSlug = actData?.slug || actData?.tscSlug || actData?.urlSlug || slugify(actData?.tscName);
  const actPath = `/act/${encodeURIComponent(actSlug || actData?._id || "")}`;

return (
<div ref={cardRef} className={`relative group m-4 shrink-0 w-full max-w-[380px] sm:w-[320px] ${className ? className : ''}`}
 onMouseEnter={onMouseEnter}
 >
        <Link
  to={actPath} onClick={() => window.scrollTo(0, 0)} className="block text-gray-700">
        {/* --- Video carousel replaces image block --- */}
        <div className="relative w-full rounded overflow-hidden">
          {/* 16:9 aspect wrapper for consistent sizing on small screens */}
          <div className="relative w-full pt-[56.25%]">
            {/* Left arrow */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePrevVideo();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-gray-800 hover:text-black bg-white/70 rounded-full p-1.5 shadow-sm w-7 h-7 md:w-8 md:h-8 flex items-center justify-center"
              aria-label="Scroll left"
              type="button"
              disabled={tscVideos.length === 0}
            >
              <img
                src={assets.scroll_left_icon}
                alt="Scroll left"
                className="w-5 h-5 md:w-6 md:h-6"
              />
            </button>

            {/* Video or fallback image with play button */}
            {tscVideos.length > 0 ? (
              !isPlaying ? (
                <div
                  className="absolute inset-0 w-full h-full cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsPlaying(true);
                  }}
                >
                  <img
                    loading="lazy"
                    src={`https://img.youtube.com/vi/${extractVideoId(tscVideos[videoIndex]?.url)}/hqdefault.jpg`}
                    className="absolute inset-0 w-full h-full object-cover"
                    alt="Video thumbnail"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = images?.[0]?.url || '/placeholder.jpg';
                    }}
                  />
                  <img
                    src={assets.custom_play_iconV2}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10"
                    alt="Play"
                  />
                </div>
              ) : (
                <iframe
                  className="absolute inset-0 w-full h-full object-cover"
                  src={`https://www.youtube.com/embed/${extractVideoId(tscVideos[videoIndex]?.url) || ''}?autoplay=1&modestbranding=1&rel=0&controls=0`}
                  title="Act video preview"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            ) : (
              <img
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                src={images?.[0]?.url || '/placeholder.jpg'}
                alt="Thumbnail"
              />
            )}

            {/* Right arrow */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNextVideo();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-gray-800 hover:text-black bg-white/70 rounded-full p-1.5 shadow-sm w-7 h-7 md:w-8 md:h-8 flex items-center justify-center"
              aria-label="Scroll right"
              type="button"
              disabled={tscVideos.length === 0}
            >
              <img
                src={assets.scroll_right_icon}
                alt="Scroll right"
                className="w-5 h-5 md:w-6 md:h-6"
              />
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {tscVideos.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i === videoIndex ? 'bg-white' : 'bg-white/50'} transition`}
                />
              ))}
            </div>
          </div>
        </div>
        {/* --- End video carousel --- */}
        <div className="flex justify-between items-center pt-3 pb-1">
          <div className="min-h-[40px] flex flex-col justify-center">
            <p className="text-md text-bold">{actData.tscName}</p>
<p className="text-sm font-medium">
  {price ? (
    price.travelCalculated
      ? `£${Number(price.total || 0).toLocaleString()}`
      : `from £${Number(price.total || 0).toLocaleString()}`
  ) : (
    <button
      type="button"
      className="font-normal text-blue-600 underline mt-2 text-sm"
      onClick={(e) => {
        e.preventDefault();   // stop the <Link> navigation
        e.stopPropagation();  // stop bubbling to the <Link>
        triggerSearch?.();    // ✅ open the search bar / modal (your context function)
      }}
    >
      Add a venue postcode &amp; date for pricing
    </button>
  )}
</p>       </div>
          <div className="flex flex-col items-end justify-between min-h-[40px]">
            <button
              onClick={handleHeartClick}
              disabled={isAnimating}
              className="p-1 transition-transform duration-150 ease-in-out"
            >
             {heartOn ? (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="-1 -1 34 32"
    className={`w-6 h-6 transition-transform ${isAnimating ? 'scale-125' : ''}`}
    fill="#ff6667"
    stroke="#cc5253"
    strokeWidth="1.5"
  >
    <path d="M23.6,0c-3.4,0-6.4,2.2-7.6,5.4C14.8,2.2,11.8,0,8.4,0C3.8,0,0,3.9,0,8.7c0,4.5,3.2,7.7,8,12.2
       c3.4,3.2,6.5,5.8,7.3,6.4c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3c0.8-0.6,3.9-3.2,7.3-6.4c4.8-4.5,8-7.7,8-12.2
       C32,3.9,28.2,0,23.6,0z" />
  </svg>
) : (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="-1 -1 34 32"
    className={`w-6 h-6 transition-transform ${isAnimating ? 'scale-125' : ''}`}
    fill="none"
    stroke="#000"
    strokeWidth="1.5"
  >
    <path d="M23.6,0c-3.4,0-6.4,2.2-7.6,5.4C14.8,2.2,11.8,0,8.4,0C3.8,0,0,3.9,0,8.7c0,4.5,3.2,7.7,8,12.2
       c3.4,3.2,6.5,5.8,7.3,6.4c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3c0.8-0.6,3.9-3.2,7.3-6.4c4.8-4.5,8-7.7,8-12.2
       C32,3.9,28.2,0,23.6,0z" />
  </svg>
)}
            </button>
<p className={`text-xs ${loveCount === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
  {loveCount === 0
    ? 'love me'
    : `${formatLoveCount(loveCount)} ${loveCount === 1 ? 'love' : 'loves'}`}
</p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ShortlistItem;