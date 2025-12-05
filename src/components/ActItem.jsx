// frontend/src/components/ActItem.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import calculateActPricing from '../pages/utils/pricing';
import { ShopContext } from '../context/ShopContext';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers to support BOTH shapes: lightweight ActCard and full Act document
// ActCard fields: { actId, imageUrl, basePrice, loveCount, name, tscName, availabilityBadge }
// Full Act fields: { _id, profileImage[], formattedPrice, numberOfShortlistsIn, lineups, ... }
// ──────────────────────────────────────────────────────────────────────────────
const getActId = (src) => src?.actId || src?._id || src?.id || '';
const getTitle = (src) => src?.tscName || src?.name || 'Act';
const getImageUrl = (src) =>
  src?.imageUrl || src?.profileImage?.[0]?.url || '/placeholder.jpg';
const getBadge = (src) => src?.availabilityBadge || null;
const getBasePrice = (src) => {
  if (src?.basePrice != null) return Number(String(src.basePrice).replace(/[^0-9.+-]/g, ''));
  const lineup = src?.lineups?.[0] || null;
  const base = src?.formattedPrice?.total ?? lineup?.base_fee?.[0]?.total_fee ?? null;
  return base != null ? Number(String(base).replace(/[^0-9.+-]/g, '')) : null;
};
const getLove = (src, shortlistCount) => {
  const n = src?.loveCount ?? src?.numberOfShortlistsIn ?? shortlistCount ?? src?.shortlistCount ?? src?.metrics?.shortlists ?? 0;
  return Number(n) || 0;
};

const ActItem = ({ actData, shortlistCount }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAnimating, setIsAnimating] = useState(false);
  const [loveCount, setLoveCount] = useState(() => getLove(actData, shortlistCount));
  const [price, setPrice] = useState(null);

  // ✅ use shortlist from context
  const {
    shortlistedActs,
    shortlistAct,
    userId,
    selectedCounty,
    selectedAddress,
    selectedDate,
  } = useContext(ShopContext);

  // Keep loveCount in sync when actData changes
  useEffect(() => {
    setLoveCount(getLove(actData, shortlistCount));
  }, [actData?.loveCount, actData?.numberOfShortlistsIn, actData?.shortlistCount, actData?.metrics?.shortlists, shortlistCount]);

  // Compute/refresh price
  useEffect(() => {
    const run = async () => {
      try {
        // If we only have a card (no lineups), we can't compute travel here → show base and exit
        const hasLineups = Array.isArray(actData?.lineups) && actData.lineups.length > 0;
        const baseOnly = getBasePrice(actData);

        // No date/location → just show base
        const hasAnyLocation = !!(selectedAddress || selectedCounty);
        if (!hasAnyLocation || !selectedDate || !hasLineups) {
          if (baseOnly != null) setPrice({ total: baseOnly, travelCalculated: false });
          return;
        }

        // Only use county travel if configured
        const hasCountyTable = !!(actData?.useCountyTravelFee && actData?.countyFees && Object.keys(actData.countyFees).length > 0);
        const lineup = actData.lineups[0];

        const result = await calculateActPricing(
          actData,
          hasCountyTable ? selectedCounty : null,
          selectedAddress,
          selectedDate,
          lineup
        );

        if (!result || result.total == null) {
          if (baseOnly != null) setPrice({ total: baseOnly, travelCalculated: false });
          return;
        }

        setPrice(result);
      } catch (err) {
        console.error('❌ Failed to calculate price:', {
          err,
          actId: getActId(actData),
          useCountyTravelFee: actData?.useCountyTravelFee,
        });
        const baseOnly = getBasePrice(actData);
        if (baseOnly != null) setPrice({ total: baseOnly, travelCalculated: false });
      }
    };

    run();
  }, [actData, selectedCounty, selectedAddress, selectedDate]);

  // Display total chooses computed price, else base from card/act
  const rawTotal = price?.total ?? getBasePrice(actData);
  const displayTotal = rawTotal != null ? Number(String(rawTotal).replace(/[^0-9.+-]/g, '')) : null;

  const handleHeartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 🔒 Require login before shortlisting
    if (!userId) {
      const fromActsListing = String(location.pathname || '').startsWith('/acts');
      const listUrl = `${location.pathname || ''}${location.search || ''}${location.hash || ''}` || '/acts';
      const actUrl = getActId(actData) ? `/act/${getActId(actData)}` : '/';
      const fallback = fromActsListing ? listUrl : actUrl;
      sessionStorage.setItem('postLoginNext', fallback);
      navigate('/login', { state: { from: fallback } });
      return;
    }

    setIsAnimating(true);

    // ✅ Optimistic local count change layered on top of DB value
    const isShortlistedNow = shortlistedActs?.includes(String(getActId(actData)));
    setLoveCount((prev) => {
      const safe = Number(prev) || 0;
      return isShortlistedNow ? Math.max(0, safe - 1) : safe + 1;
    });

    shortlistAct(userId, getActId(actData));

    setTimeout(() => setIsAnimating(false), 300);
  };

  const formatLoveCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return count;
  };

  const isShortlisted = shortlistedActs?.includes(String(getActId(actData)));

  // Decide which image to show (availability badge takes priority if matching date)
  const badge = getBadge(actData) || {};
  const selectedISO = selectedDate ? new Date(selectedDate).toISOString().slice(0, 10) : null;
  const badgeDateISO = badge?.dateISO || null;
  const badgeActive = Boolean(badge?.active);
  const badgeHasPhoto = Boolean(badge?.photoUrl);
  const badgeMatches = Boolean(badgeActive && badgeDateISO && selectedISO && badgeDateISO === selectedISO);
  const resolvedImage = (badgeMatches && badgeHasPhoto) ? badge.photoUrl : getImageUrl(actData);

  return (
    <div className="relative group">
      <Link
        to={`/act/${getActId(actData)}`}
        onClick={() => window.scrollTo(0, 0)}
        className="block text-gray-700"
      >
        <div className="overflow-hidden h-full w-full">
          <img
            className="h-full w-full object-cover hover:scale-110 transition ease-in-out"
            src={resolvedImage}
            alt={getTitle(actData)}
          />
        </div>

        <div className="flex justify-between items-center pt-3 pb-1">
          <div className="min-h-[40px] flex flex-col justify-center">
            <p className="text-sm">{getTitle(actData)}</p>
            <div className="act-price">
              {displayTotal !== null
                ? (price?.travelCalculated ? `£${displayTotal}` : `from £${displayTotal}`)
                : 'Loading price...'}
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end justify-between min-h-[40px]">
            <button
              onClick={handleHeartClick}
              disabled={isAnimating}
              className="p-1 transition-transform duration-150 ease-in-out"
              aria-label={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
              title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
            >
              {isShortlisted ? (
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

            {/* Always show a readable label */}
            <p className={`text-xs ${loveCount === 0 ? 'text-gray-400' : 'text-gray-700'} text-center w-full self-center lg:self-end`}>
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

export default ActItem;