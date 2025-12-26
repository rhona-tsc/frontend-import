// frontend/src/components/ActItem.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import calculateActPricing from '../pages/utils/pricing';
import { ShopContext } from '../context/ShopContext';
import PropTypes from 'prop-types';

// ──────────────────────────────────────────────────────────────────────────────
// Lightweight debug logger for this component
// Toggle on/off without touching every console.log
// ──────────────────────────────────────────────────────────────────────────────
const DBG = true; // set to false to silence logs
const DBG_PRICE = true; // pricing-only logs
const dlog = (...a) => DBG && console.log('🎯[ActItem]', ...a);

// Grouped pricing logger to make per-act fee builds easy to scan
const pgroup = (label, fn) => {
  if (!(DBG && DBG_PRICE)) return fn();
  console.groupCollapsed(`💷[ActItem] ${label}`);
  try { fn(); } finally { console.groupEnd(); }
};

const pmoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `£${n}` : String(v);
};

// ──────────────────────────────────────────────────────────────────────────────
// Margin to apply on all displayed prices
// ──────────────────────────────────────────────────────────────────────────────
const MARGIN_RATE = 0.33; // 33%
const applyMargin = (v) => {
  const n = Number(v) || 0;
  return Math.ceil(n * (1 + MARGIN_RATE));
};

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
  return Math.max(0, Number(n) || 0);
};

// Manual override: if you set this in actcards/actfiltercards, we can show a stable "from" price
// when no location/date is selected (avoids slow/buggy derived pricing for now).
const getMinDisplayPrice = (src) => {
  const v =
    src?.minBasePrice ??
    src?.min_base_price ??
    src?.minBase ??
    src?.minDisplayPrice ??
    src?.minPriceDisplay ??
    src?.minPrice ??
    src?.minimumFee ??
    src?.minFee;

  const n = v == null ? null : Number(String(v).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// ──────────────────────────────────────────────────────────────────────────────
// Travel model normalizers (ActCards may store these under travelModel)
// ──────────────────────────────────────────────────────────────────────────────
const getTravelModel = (src) => src?.travelModel || src?.travelModelHints || null;

const getUseCountyTravelFee = (src) => {
  const tm = getTravelModel(src);
  return Boolean((src?.useCountyTravelFee ?? tm?.useCountyTravelFee) || false);
};

const getUseMUTravelRates = (src) => {
  const tm = getTravelModel(src);
  return Boolean((src?.useMUTravelRates ?? tm?.useMUTravelRates) || false);
};

const getCostPerMile = (src) => {
  const tm = getTravelModel(src);
  const v = src?.costPerMile ?? tm?.costPerMile;
  return v == null ? null : num(v);
};

const getCountyFees = (src) => {
  const tm = getTravelModel(src);
  return src?.countyFees || tm?.countyFees || null;
};

const getHasCountyFees = (src) => {
  const cf = getCountyFees(src);
  const tm = getTravelModel(src);
  if (cf && typeof cf === 'object' && Object.keys(cf).length > 0) return true;
  return Boolean(tm?.hasCountyFees);
};

// ──────────────────────────────────────────────────────────────────────────────
// Pricing helpers (fallback when base_fee is missing)
//   • Choose the SMALLEST lineup by bandMembers count (tie-breaker: cheaper)
//   • Sum each member's fee + essential additionalRoles' additionalFee
//   • Travel adds: (min county fee) × (member count, excluding managers)
// ──────────────────────────────────────────────────────────────────────────────
const num = (v) => (v == null ? 0 : Number(String(v).replace(/[^0-9.+-]/g, '')) || 0);

const essentialRolesFee = (member) => {
  const roles = Array.isArray(member?.additionalRoles) ? member.additionalRoles : [];
  return roles.reduce((s, r) => s + (r?.isEssential ? num(r?.additionalFee) : 0), 0);
};

const isManagerMember = (member) => /manager/i.test(String(member?.instrument || ''));

const minCountyFeeFromAct = (act) => {
  const useCounty = getUseCountyTravelFee(act);
  const countyFees = getCountyFees(act);
  if (!(useCounty && countyFees && typeof countyFees === 'object')) return 0;
  const vals = Object.values(countyFees)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);
  return vals.length ? Math.min(...vals) : 0;
};

const lineupBareFee = (lineup) => {
  const members = Array.isArray(lineup?.bandMembers) ? lineup.bandMembers : [];
  return members.reduce((sumFees, m) => sumFees + num(m?.fee) + essentialRolesFee(m), 0);
};

const computeBaseFromSmallestLineup = (act) => {
  const lineups = Array.isArray(act?.lineups) ? act.lineups : [];
  if (!lineups.length) return null;

  // Sort: smallest member count first; then cheaper bare fee as tie-breaker
  const sorted = [...lineups].sort((a, b) => {
    const na = Array.isArray(a?.bandMembers) ? a.bandMembers.length : Number.POSITIVE_INFINITY;
    const nb = Array.isArray(b?.bandMembers) ? b.bandMembers.length : Number.POSITIVE_INFINITY;
    if (na !== nb) return na - nb;
    return lineupBareFee(a) - lineupBareFee(b);
  });

  const chosen = sorted[0];
  if (!chosen) return null;

  const members = Array.isArray(chosen.bandMembers) ? chosen.bandMembers : [];

  // Per-member fee breakdown (fee + essential additionalRoles)
  const memberBreakdown = members.map((m, idx) => {
    const fee = num(m?.fee);
    const essential = essentialRolesFee(m);
    const total = fee + essential;
    const roles = Array.isArray(m?.additionalRoles)
      ? m.additionalRoles
          .filter((r) => r?.isEssential)
          .map((r) => ({ role: r?.customRole || r?.role || 'Role', fee: num(r?.additionalFee) }))
      : [];

    return {
      idx,
      name: m?.firstName ? `${m.firstName}${m?.lastName ? ` ${m.lastName}` : ''}` : undefined,
      instrument: m?.instrument,
      isManager: isManagerMember(m),
      fee,
      essentialRolesFee: essential,
      essentialRoles: roles,
      memberTotal: total,
    };
  });

  const memberFees = memberBreakdown.reduce((s, x) => s + (Number(x.memberTotal) || 0), 0);

  // Travel: exclude manager from *count* only
  const travelCount = memberBreakdown.reduce((n, m) => n + (m.isManager ? 0 : 1), 0);
  const travelUnit = minCountyFeeFromAct(act);
  const travel = (Number(travelUnit) || 0) * (Number(travelCount) || 0);

  const total = memberFees + travel;

  pgroup(`Derived base (no when/where) — ${getTitle(act)} (${getActId(act)})`, () => {
    dlog('chosen lineup snapshot', {
      act: getTitle(act),
      lineupLabel: chosen?.act_size || chosen?.actSize || null,
      memberCount: members.length,
      useCountyTravelFee: getUseCountyTravelFee(act),
      hasCountyFees: getHasCountyFees(act),
    });

    dlog('member breakdown', memberBreakdown);

    dlog('travel breakdown', {
      travelCount,
      travelUnit,
      travel,
    });

    dlog('totals (pre-margin)', {
      memberFees,
      travel,
      total,
    });
  });

  return Number.isFinite(total) ? total : null;
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
    getCardPriceWithTravel, // 🔹 for travel-aware pricing when we only have a card
  } = useContext(ShopContext);

  

  // Keep loveCount in sync when actData changes
  useEffect(() => {
    setLoveCount(getLove(actData, shortlistCount));
  }, [
    actData?.loveCount,
    actData?.numberOfShortlistsIn,
    actData?.shortlistCount,
    actData?.metrics?.shortlists,
    shortlistCount,
  ]);

  // Compute/refresh price
  useEffect(() => {
    const run = async () => {
      try {
        const id = getActId(actData);
        const baseOnly = getBasePrice(actData);
        const hasLineups = Array.isArray(actData?.lineups) && actData.lineups.length > 0;

        const hasAddress = !!(selectedAddress && String(selectedAddress).trim());
        const manualMin = getMinDisplayPrice(actData);

        pgroup(`Price build — ${getTitle(actData)} (${id})`, () => {
          dlog('inputs', {
            id,
            title: getTitle(actData),
            hasLineups,
            baseOnly,
            hasAddress,
            selectedCounty: selectedCounty || null,
            selectedAddress: selectedAddress || null,
            selectedDate: selectedDate || null,
            useCountyTravelFee: getUseCountyTravelFee(actData),
            travelModeHints: {
              useMUTravelRates: getUseMUTravelRates(actData),
              useCountyTravelFee: getUseCountyTravelFee(actData),
              costPerMile: getCostPerMile(actData),
              hasCountyFees: getHasCountyFees(actData),
            },
            cardFields: Object.keys(actData || {}),
          });
        });

        // No date/location → show MANUAL minDisplayPrice first (if present), else derived base from lineups, else fallback base
        if (!hasAddress || !selectedDate) {
          if (manualMin != null) {
            pgroup(`Price result (manual minDisplayPrice) — ${getTitle(actData)} (${id})`, () => {
              dlog('manualMin (display, no extra margin applied)', pmoney(manualMin));
            });
            setPrice({ total: manualMin, travelCalculated: false, isManual: true });
            return;
          }

          const derived = computeBaseFromSmallestLineup(actData);
          if (derived != null) {
            const withMargin = applyMargin(derived);
            pgroup(`Price result (no when/where) — ${getTitle(actData)} (${id})`, () => {
              dlog('derived base (pre-margin)', pmoney(derived));
              dlog('derived base (post-margin)', pmoney(withMargin));
            });
            setPrice({ total: withMargin, travelCalculated: false });
          } else if (baseOnly != null) {
            const withMargin = applyMargin(baseOnly);
            pgroup(`Price result (no when/where fallback) — ${getTitle(actData)} (${id})`, () => {
              dlog('baseOnly (pre-margin)', pmoney(baseOnly));
              dlog('baseOnly (post-margin)', pmoney(withMargin));
            });
            setPrice({ total: withMargin, travelCalculated: false });
          } else {
            pgroup(`Price result (no when/where) — ${getTitle(actData)} (${id})`, () => {
              dlog('no price available (manualMin + derived + baseOnly missing)');
            });
          }
          return;
        }

        // If this is a lightweight card (no lineups), try context helper to compute travel-aware total
        if (!hasLineups) {
          if (typeof getCardPriceWithTravel === 'function') {
            try {
              const total = await getCardPriceWithTravel(id);
              if (Number.isFinite(total)) {
                const withMargin = applyMargin(total);
                pgroup(`Card travel-aware pricing — ${getTitle(actData)} (${id})`, () => {
                  dlog('card travel-aware total (pre-margin)', pmoney(total));
                  dlog('card travel-aware total (post-margin)', pmoney(withMargin));
                  dlog('context inputs', {
                    selectedCounty: selectedCounty || null,
                    selectedAddress: selectedAddress || null,
                    selectedDate: selectedDate || null,
                  });
                });
                setPrice({ total: withMargin, travelCalculated: true });
                return;
              }
            } catch (err) {
              dlog('card travel-aware pricing failed', err?.message || err);
            }
          }
          if (baseOnly != null) {
            const withMargin = applyMargin(baseOnly);
            pgroup(`Card fallback baseOnly — ${getTitle(actData)} (${id})`, () => {
              dlog('baseOnly (pre-margin)', pmoney(baseOnly));
              dlog('baseOnly (post-margin)', pmoney(withMargin));
            });
            setPrice({ total: withMargin, travelCalculated: false });
          }
          return;
        }

        // Full act doc available → compute locally
        const countyFees = getCountyFees(actData);
        const hasCountyTable = Boolean(
          getUseCountyTravelFee(actData) &&
          countyFees &&
          typeof countyFees === 'object' &&
          Object.keys(countyFees).length > 0
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
          if (baseOnly != null) {
            pgroup(`Full pricing fallback baseOnly — ${getTitle(actData)} (${id})`, () => {
              dlog('calc failed, fallback baseOnly', baseOnly);
            });
            setPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          } else {
            pgroup(`Full pricing fallback — ${getTitle(actData)} (${id})`, () => {
              dlog('calc failed, no baseOnly');
            });
          }
          return;
        }

        const withMargin = applyMargin(result.total);
        pgroup(`Full pricing breakdown — ${getTitle(actData)} (${id})`, () => {
          dlog('calculateActPricing() result (raw)', result);
          dlog('total (pre-margin)', pmoney(result.total));
          dlog('total (post-margin)', pmoney(withMargin));
          dlog('selected inputs', {
            selectedCounty: selectedCounty || null,
            selectedAddress: selectedAddress || null,
            selectedDate: selectedDate || null,
          });
          dlog('act travel flags', {
            useMUTravelRates: getUseMUTravelRates(actData),
            useCountyTravelFee: getUseCountyTravelFee(actData),
            costPerMile: getCostPerMile(actData),
            hasCountyFees: getHasCountyFees(actData),
          });
        });
        setPrice({ ...result, total: withMargin });
      } catch (err) {
        console.error('❌ Failed to calculate price:', {
          err,
          actId: getActId(actData),
          useCountyTravelFee: actData?.useCountyTravelFee,
        });
        const baseOnly = getBasePrice(actData);
        if (baseOnly != null) setPrice({ total: applyMargin(baseOnly), travelCalculated: false });
      }
    };

    run();
  }, [actData, selectedCounty, selectedAddress, selectedDate, getCardPriceWithTravel]);

  // Display total chooses computed price, else base from card/act
  // Ensure margin is applied even if we fell back to base price without computing `price`
  const hasAddress = !!(selectedAddress && String(selectedAddress).trim());
  const manualMin = (!hasAddress || !selectedDate) ? getMinDisplayPrice(actData) : null;

  // price.total is already post-margin when derived/calc’d, and already display-ready when manualMin is used.
  const rawTotal =
    price?.total ??
    (manualMin != null
      ? manualMin
      : (getBasePrice(actData) != null ? applyMargin(getBasePrice(actData)) : null));
  // Helpful trace: what ends up in the UI
  useEffect(() => {
    pgroup(`UI total — ${getTitle(actData)} (${getActId(actData)})`, () => {
      if (!(DBG && DBG_PRICE)) return;
      dlog('price state', price);
      dlog('basePrice source (pre-margin)', getBasePrice(actData));
      dlog('UI rawTotal (post-margin)', rawTotal);
    });
  }, [actData, price, rawTotal]);

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
      dlog('redirecting to login for shortlist', { fallback });
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

ActItem.propTypes = {
  actData: PropTypes.object.isRequired,
  shortlistCount: PropTypes.number,
};

export default ActItem;
