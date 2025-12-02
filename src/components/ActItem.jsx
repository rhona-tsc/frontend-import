import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import CustomToast from './CustomToast';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import calculateActPricing from '../pages/utils/pricing';
import { ShopContext } from '../context/ShopContext';
import useOnScreen from '../hooks/useOnScreen';
import { priceCache, makePriceKey } from '../pages/utils/priceCache';
import useRenderTracker from '../hooks/useRenderTracker'; // 👈 add this import

const ActItem = ({ actData, shortlistCount }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const cardRef = React.useRef(null);
  const isOnScreen = useOnScreen(cardRef);
  const [isAnimating, setIsAnimating] = useState(false);

  // Robust initial love count (DB source preferred) -> fallbacks
  const initialLove =
    Number(
      actData?.timesShortlisted ??
      shortlistCount ??
      actData?.shortlistCount ??
      actData?.metrics?.shortlists ??
      0
    ) || 0;


  const [loveCount, setLoveCount] = useState(initialLove);
  const [price, setPrice] = useState(null);

  // ✅ render tracker — place after you have basic props you want to log
  useRenderTracker('ActItem', {
    actId: actData?._id,
    name: actData?.tscName,
    hasLineups: !!actData?.lineups?.length,
    shortlisted: !!shortlistCount,
    onScreen: isOnScreen,
  });

  // ✅ use shortlist from context
  const {
    shortlistedActs,
    shortlistAct,
    userId,
    selectedCounty,
    selectedAddress,
    selectedDate,
  } = useContext(ShopContext);

  const getBasePrice = (act) => {
    const lineup = act?.lineups?.[0] || null;
    const base =
      act?.formattedPrice?.total ??
      lineup?.base_fee?.[0]?.total_fee ??
      null;
    return base != null ? Number(String(base).replace(/[^0-9.+-]/g, '')) : null;
  };

  // Keep loveCount in sync with DB when actData changes
  useEffect(() => {
    const next =
      Number(
        actData?.timesShortlisted ??
        shortlistCount ??
        actData?.shortlistCount ??
        actData?.metrics?.shortlists ??
        0
      ) || 0;
    setLoveCount(next);
  }, [
    actData?.timesShortlisted,
    shortlistCount,
    actData?.shortlistCount,
    actData?.metrics?.shortlists
  ]);

  useEffect(() => {
    // 0) If no lineups yet, show base if possible and bail
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
      actId: actData._id,
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
          hasCountyTable ? selectedCounty : null, // only pass county if configured
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
        console.error('❌ Failed to calculate price:', {
          err,
          actId: actData?._id,
          useCountyTravelFee: actData?.useCountyTravelFee,
        });
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

  const rawTotal = (actData?.formattedPrice?.total ?? price?.total);
  const displayTotal =
    rawTotal != null ? Number(String(rawTotal).replace(/[^0-9.+-]/g, '')) : null;

  const handleHeartClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 🔒 Require login before shortlisting
    if (!userId) {
      const fromActsListing = String(location.pathname || '').startsWith('/acts');
      const listUrl =
        `${location.pathname || ''}${location.search || ''}${location.hash || ''}` || '/acts';
      const actUrl = actData?._id ? `/act/${actData._id}` : '/';
      const fallback = fromActsListing ? listUrl : actUrl;
      sessionStorage.setItem('postLoginNext', fallback);
      navigate('/login', { state: { from: fallback } });
      return;
    }

    setIsAnimating(true);

    // ✅ Optimistic local count change layered on top of DB value
    const isShortlistedNow = shortlistedActs?.includes(String(actData?._id));
    setLoveCount((prev) => {
      const safe = Number(prev) || 0;
      return isShortlistedNow ? Math.max(0, safe - 1) : safe + 1;
    });

    shortlistAct(userId, actData._id);
    try {
      const lineupId = actData?.lineups?.[0]?._id;

      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/availability/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          actId: actData._id,
          lineupId,
          selectedDate,
          selectedAddress,
          selectedCounty,
          source: "Website",
        }),
      });

    } catch (err) {
      console.error("❌ Failed to POST /api/availability/request:", err);
    }
    setTimeout(() => setIsAnimating(false), 300);
  };

  const formatLoveCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return count;
  };

  const isShortlisted = shortlistedActs?.includes(String(actData?._id));

  return (
    <div ref={cardRef} className="relative group">
      <Link
        to={`/act/${actData?._id}`}
        onClick={() => window.scrollTo(0, 0)}
        className="block text-gray-700"
      >
        <div className="overflow-hidden h-full w-full">
          {(() => {
            const resolvedImage =
              (actData?.profileImage?.[0]?.url || '/placeholder.jpg');

            return (
              <img
                loading="lazy"
                className="h-full w-full object-cover hover:scale-110 transition ease-in-out"
                src={resolvedImage}
                alt={actData?.tscName || 'Act'}
              />
            );
          })()}
        </div>

        <div className="flex justify-between items-center pt-3 pb-1">
          <div className="min-h-[40px] flex flex-col justify-center">
            <p className="text-sm">{actData?.tscName}</p>
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