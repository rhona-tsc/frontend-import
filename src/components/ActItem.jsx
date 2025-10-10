// frontend/src/components/ActItem.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import calculateActPricing from '../pages/utils/pricing';
import { ShopContext } from '../context/ShopContext';

const ActItem = ({ actData, shortlistCount }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAnimating, setIsAnimating] = useState(false);

  // Robust initial love count (DB source preferred) -> fallbacks
  const initialLove =
    Number(
      actData?.numberOfShortlistsIn ??
      shortlistCount ??
      actData?.shortlistCount ??
      actData?.metrics?.shortlists ??
      0
    ) || 0;

  console.debug('💖 loveCount source →', {
    fromDB: actData?.numberOfShortlistsIn,
    fromProp: shortlistCount,
    fromAct: actData?.shortlistCount,
    fromMetrics: actData?.metrics?.shortlists,
    initialLove
  });

  const [loveCount, setLoveCount] = useState(initialLove);
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

  // Keep loveCount in sync with DB when actData changes
  useEffect(() => {
    const next =
      Number(
        actData?.numberOfShortlistsIn ??
        shortlistCount ??
        actData?.shortlistCount ??
        actData?.metrics?.shortlists ??
        0
      ) || 0;
    setLoveCount(next);
  }, [
    actData?.numberOfShortlistsIn,
    shortlistCount,
    actData?.shortlistCount,
    actData?.metrics?.shortlists
  ]);

  useEffect(() => {
    const calculateAndSetPrice = async () => {
      try {
        if (!actData?.lineups?.length) {
          console.warn('⚠️ Missing actData or lineups in ActItem:', actData);
          return;
        }

        // Only use county travel if it’s actually configured
        const hasCountyTable =
          actData.useCountyTravelFee &&
          actData.countyFees &&
          Object.keys(actData.countyFees).length > 0;

        const lineup = actData.lineups[0];

        const result = await calculateActPricing(
          actData,
          hasCountyTable ? selectedCounty : null,
          selectedAddress,
          selectedDate,
          lineup
        );

        // Hard fallback if util returns nothing
        if (!result || result.total == null) {
          const base =
            actData?.formattedPrice?.total ??
            lineup?.base_fee?.[0]?.total_fee ??
            null;

          setPrice(base != null ? { total: base, travelCalculated: false } : null);
          return;
        }

        setPrice(result);
      } catch (err) {
        console.error('❌ Failed to calculate price:', {
          err,
          actId: actData?._id,
          useCountyTravelFee: actData?.useCountyTravelFee,
        });
        // Last-resort fallback so UI never gets stuck
        const lineup = actData.lineups?.[0];
        const base =
          actData?.formattedPrice?.total ??
          lineup?.base_fee?.[0]?.total_fee ??
          null;
        setPrice(base != null ? { total: base, travelCalculated: false } : null);
      }
    };
    calculateAndSetPrice();
  }, [actData, selectedCounty, selectedAddress, selectedDate]);

  const rawTotal = (actData?.formattedPrice?.total ?? price?.total);
  const displayTotal =
    rawTotal != null ? Number(String(rawTotal).replace(/[^0-9.+-]/g, '')) : null;

  const handleHeartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 🔒 Require login before shortlisting
    if (!userId) {
      // If we came from the Acts listing, return to that exact list (with filters/query)
      const fromActsListing = String(location.pathname || '').startsWith('/acts');
      const listUrl =
        `${location.pathname || ''}${location.search || ''}${location.hash || ''}` || '/acts';

      // Otherwise, fall back to the specific act profile
      const actUrl = actData?._id ? `/act/${actData._id}` : '/';

      const fallback = fromActsListing ? listUrl : actUrl;

      // Persist the intended next page for the login screen to read
      sessionStorage.setItem('postLoginNext', fallback);

      // Navigate to login
      navigate('/login', { state: { from: fallback } });
      return; // 👈 do not continue
    }

    setIsAnimating(true);

    // ✅ Optimistic local count change layered on top of DB value
    const isShortlistedNow = shortlistedActs?.includes(String(actData?._id));
    setLoveCount((prev) => {
      const safe = Number(prev) || 0;
      return isShortlistedNow ? Math.max(0, safe - 1) : safe + 1;
    });

    shortlistAct(userId, actData._id);

    setTimeout(() => setIsAnimating(false), 300);
  };

  const formatLoveCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return count;
  };

  const isShortlisted = shortlistedActs?.includes(String(actData?._id));

  return (
    <div className="relative group">
      <Link
        to={`/act/${actData?._id}`}
        onClick={() => window.scrollTo(0, 0)}
        className="block text-gray-700"
      >
        <div className="overflow-hidden h-full w-full">
          {(() => {
            // 🔍 Decide which image to show, with badge taking priority when it matches the selected date
            const badge = actData?.availabilityBadge || {};
            const selectedISO = selectedDate
              ? new Date(selectedDate).toISOString().slice(0, 10)
              : null;
            const badgeDateISO = badge?.dateISO || null;
            const badgeActive = Boolean(badge?.active);
            const badgeHasPhoto = Boolean(badge?.photoUrl);
            const badgeMatches = Boolean(
              badgeActive && badgeDateISO && selectedISO && badgeDateISO === selectedISO
            );

            const resolvedImage =
              (badgeMatches && badgeHasPhoto
                ? badge.photoUrl
                : (actData?.profileImage?.[0]?.url || '/placeholder.jpg'));

            return (
              <img
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