// frontend/src/components/CardFilterActItem.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import calculateActPricing from '../pages/utils/pricing';
import { ShopContext } from '../context/ShopContext';

const MARGIN_RATE = 0.33;
const applyMargin = (v) => Math.ceil((Number(v) || 0) * (1 + MARGIN_RATE));

const getActId   = (src) => src?.actId || src?._id || src?.id || '';
const getTitle   = (src) => src?.tscName || src?.name || 'Act';
const getImageUrl = (src) => {
  const v = src?.imageUrl || src?.profileImage?.[0]?.url || '';
  return v && v.startsWith('http') ? v : '/placeholder.jpg';
};
const getBadge   = (src) => src?.availabilityBadge || null;
const getBasePrice = (src) => {
  if (src?.basePrice != null) return Number(String(src.basePrice).replace(/[^0-9.+-]/g, ''));
  const lineup = src?.lineups?.[0] || null;
  const base = src?.formattedPrice?.total ?? lineup?.base_fee?.[0]?.total_fee ?? null;
  return base != null ? Number(String(base).replace(/[^0-9.+-]/g, '')) : null;
};
const getLove = (src, fallback) => {
  const n = src?.timesShortlisted ?? src?.loveCount ?? fallback ?? 0;
  return Math.max(0, Number(n) || 0);
};

const getSlug = (src) => {
  const s =
    src?.slug ||
    src?.tscSlug ||
    src?.routeSlug ||
    src?.key || // if you store it like this anywhere
    "";

  return typeof s === "string" ? s.trim() : "";
};

const getActUrl = (src) => {
  const slug = getSlug(src);
  const id = getActId(src);
  return slug ? `/act/${encodeURIComponent(slug)}` : (id ? `/act/${id}` : "/");
};
// ——— helpers for fallback base calculation ———
const num = (v) => (v == null ? 0 : Number(String(v).replace(/[^0-9.+-]/g, '')) || 0);
const essentialRolesFee = (member) => {
  const roles = Array.isArray(member?.additionalRoles) ? member.additionalRoles : [];
  return roles.reduce((s, r) => s + (r?.isEssential ? num(r?.additionalFee) : 0), 0);
};
const isManagerMember = (m) => /manager/i.test(String(m?.instrument || ''));
const minCountyFeeFromAct = (act) => {
  if (!(act?.useCountyTravelFee && act?.countyFees && typeof act.countyFees === 'object')) return 0;
  const vals = Object.values(act.countyFees).map(Number).filter((v) => Number.isFinite(v) && v > 0);
  return vals.length ? Math.min(...vals) : 0;
};
const lineupBareFee = (lineup) => {
  const members = Array.isArray(lineup?.bandMembers) ? lineup.bandMembers : [];
  return members.reduce((sum, m) => sum + num(m?.fee) + essentialRolesFee(m), 0);
};
const computeBaseFromSmallestLineup = (act) => {
  const lineups = Array.isArray(act?.lineups) ? act.lineups : [];
  if (!lineups.length) return null;
  const sorted = [...lineups].sort((a, b) => {
    const na = Array.isArray(a?.bandMembers) ? a.bandMembers.length : Number.POSITIVE_INFINITY;
    const nb = Array.isArray(b?.bandMembers) ? b.bandMembers.length : Number.POSITIVE_INFINITY;
    if (na !== nb) return na - nb;
    return lineupBareFee(a) - lineupBareFee(b);
  });
  const chosen = sorted[0];
  if (!chosen) return null;
  const members = Array.isArray(chosen.bandMembers) ? chosen.bandMembers : [];
  const travelCount = members.reduce((n, m) => n + (isManagerMember(m) ? 0 : 1), 0);
  const travelUnit = minCountyFeeFromAct(act);
  const total = lineupBareFee(chosen) + travelUnit * travelCount;
  return Number.isFinite(total) ? total : null;
};

const PriceSkeleton = () => (
  <div className="h-5 w-24 rounded-md bg-gray-200 animate-pulse" />
);

const CardFilterItem = ({ actData, shortlistCount, standalone = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  let ctx = {};
  try { ctx = useContext(ShopContext) || {}; } catch { ctx = {}; }

  const {
    shortlistedActs,
    shortlistAct,
    userId,
    selectedCounty,
    selectedAddress,
    selectedDate,
    getCardPriceWithTravel,
  } = ctx;

  const [isAnimating, setIsAnimating] = useState(false);
  const [loveCount, setLoveCount] = useState(() => getLove(actData, shortlistCount));
  const [price, setPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    setLoveCount(getLove(actData, shortlistCount));
  }, [
    actData?.loveCount,
    actData?.numberOfShortlistsIn,
    actData?.shortlistCount,
    actData?.metrics?.shortlists,
    shortlistCount
  ]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadingPrice(true);
      try {
        const id = getActId(actData);
        const baseOnly = getBasePrice(actData);
        const hasLineups = Array.isArray(actData?.lineups) && actData.lineups.length > 0;
        const hasAnyLocation = !!(selectedAddress || selectedCounty);

        if (standalone) {
          if (baseOnly != null) {
            !cancelled && setPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          } else {
            const derived = computeBaseFromSmallestLineup(actData);
            if (derived != null && !cancelled) setPrice({ total: applyMargin(derived), travelCalculated: false });
          }
          return;
        }

        if (!hasAnyLocation || !selectedDate) {
          const derived = computeBaseFromSmallestLineup(actData);
          if (derived != null) {
            !cancelled && setPrice({ total: applyMargin(derived), travelCalculated: false });
          } else if (baseOnly != null) {
            !cancelled && setPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          }
          return;
        }

        if (!hasLineups) {
          if (typeof getCardPriceWithTravel === 'function') {
            try {
              const total = await getCardPriceWithTravel(id);
              if (Number.isFinite(total) && !cancelled) {
                // getCardPriceWithTravel should return NET; we margin once here:
                setPrice({ total: applyMargin(total), travelCalculated: true });
                return;
              }
            } catch {}
          }
          if (baseOnly != null && !cancelled) setPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          return;
        }

        const hasCountyTable = !!(
          actData?.useCountyTravelFee && actData?.countyFees && Object.keys(actData.countyFees).length > 0
        );
        const lineup = actData.lineups[0];

        const result = await calculateActPricing(
          actData,
          hasCountyTable ? selectedCounty : null,
          selectedAddress,
          selectedDate,
          lineup
        );

        if (!result || result.total == null) {
          if (baseOnly != null && !cancelled) setPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          return;
        }

        // IMPORTANT: result.total already includes the 33% margin — do NOT reapply
        !cancelled && setPrice({ ...result });
      } catch (err) {
        console.error('❌ Failed to calculate price:', {
          err,
          actId: getActId(actData),
          useCountyTravelFee: actData?.useCountyTravelFee
        });
        const baseOnly = getBasePrice(actData);
        if (baseOnly != null && !cancelled) setPrice({ total: applyMargin(baseOnly), travelCalculated: false });
      } finally {
        !cancelled && setLoadingPrice(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [actData, standalone, selectedCounty, selectedAddress, selectedDate, getCardPriceWithTravel]);

  const computedFallback =
    getBasePrice(actData) != null ? applyMargin(getBasePrice(actData)) : null;

  const rawTotal =
    price?.total != null
      ? price.total
      : computedFallback;

  const displayTotal =
    rawTotal != null ? Number(String(rawTotal).replace(/[^0-9.+-]/g, '')) : null;

  const handleHeartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (standalone) return;

    setIsAnimating(true);

    const actId = String(getActId(actData));
    const isShortlistedNow = (shortlistedActs || []).includes(actId);

    // ✅ Optimistic local count change layered on top of DB value
    setLoveCount((prev) => {
      const safe = Number(prev) || 0;
      return isShortlistedNow ? Math.max(0, safe - 1) : safe + 1;
    });

    // ✅ Let ShopContext handle guest mode + auth gate + server calls
    // (Do NOT redirect to /login here)
    shortlistAct?.(userId || null, actId);

    setTimeout(() => setIsAnimating(false), 300);
  };

  const isShortlisted = standalone ? false : (shortlistedActs || []).includes(String(getActId(actData)));

  const badge = getBadge(actData) || {};
  const selectedISO = selectedDate ? new Date(selectedDate).toISOString().slice(0, 10) : null;
  const badgeDateISO = badge?.dateISO || null;
  const badgeActive = Boolean(badge?.active);
  const badgeHasPhoto = Boolean(badge?.photoUrl);
  const badgeMatches = Boolean(badgeActive && badgeDateISO && selectedISO && badgeDateISO === selectedISO);
  const resolvedImage = (badgeMatches && badgeHasPhoto) ? badge.photoUrl : getImageUrl(actData);

  return (
    <div className="relative group">
      <Link to={getActUrl(actData)} onClick={() => { if (typeof window !== "undefined") window.scrollTo(0, 0); }} className="block text-gray-700">
        <div className="overflow-hidden h-full w-full">
          <img className="h-full w-full object-cover hover:scale-110 transition ease-in-out" src={resolvedImage} alt={getTitle(actData)} />
        </div>

        <div className="flex justify-between items-center pt-3 pb-1">
          <div className="min-h-[40px] flex flex-col justify-center">
            <p className="text-sm">{getTitle(actData)}</p>
            <div className="act-price min-h-[20px]">
              {loadingPrice ? (
                <PriceSkeleton />
              ) : displayTotal !== null ? (
                price?.travelCalculated ? `£${displayTotal}` : `from £${displayTotal}`
              ) : (
                'Loading price...'
              )}
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end justify-between min-h-[40px]">
            <button
              type="button"
              onClick={handleHeartClick}
              disabled={isAnimating || standalone}
              className="p-1 transition-transform duration-150 ease-in-out"
              aria-label={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
              title={standalone ? 'Shortlist disabled here' : (isShortlisted ? 'Remove from shortlist' : 'Add to shortlist')}
            >
              {(!standalone && isShortlisted) ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 34 32"
                  className={`w-6 h-6 transition-transform ${isAnimating ? 'scale-125' : ''}`} fill="#ff6667" stroke="#cc5253" strokeWidth="1.5">
                  <path d="M23.6,0c-3.4,0-6.4,2.2-7.6,5.4C14.8,2.2,11.8,0,8.4,0C3.8,0,0,3.9,0,8.7c0,4.5,3.2,7.7,8,12.2
                    c3.4,3.2,6.5,5.8,7.3,6.4c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3c0.8-0.6,3.9-3.2,7.3-6.4c4.8-4.5,8-7.7,8-12.2
                    C32,3.9,28.2,0,23.6,0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 34 32"
                  className={`w-6 h-6 transition-transform ${isAnimating ? 'scale-125' : ''}`} fill="none" stroke="#000" strokeWidth="1.5">
                  <path d="M23.6,0c-3.4,0-6.4,2.2-7.6,5.4C14.8,2.2,11.8,0,8.4,0C3.8,0,0,3.9,0,8.7c0,4.5,3.2,7.7,8,12.2
                    c3.4,3.2,6.5,5.8,7.3,6.4c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3c0.8-0.6,3.9-3.2,7.3-6.4c4.8-4.5,8-7.7,8-12.2
                    C32,3.9,28.2,0,23.6,0z" />
                </svg>
              )}
            </button>

            <p className={`text-xs ${loveCount === 0 ? 'text-gray-400' : 'text-gray-700'} text-center w-full self-center lg:self-end`}>
              {loveCount === 0 ? 'love me' : `${loveCount >= 1000 ? (loveCount/1000).toFixed(1).replace(/\.0$/,'')+'K' : loveCount} ${loveCount === 1 ? 'love' : 'loves'}`}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default CardFilterItem;