// frontend/src/components/ActItem.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import calculateActPricing from "../pages/utils/pricing";
import { ShopContext } from "../context/ShopContext";
import PropTypes from "prop-types";

// ──────────────────────────────────────────────────────────────────────────────
// Debug logger
// ──────────────────────────────────────────────────────────────────────────────
const DBG = true; // set false to silence all
const DBG_PRICE = true; // set false to silence pricing logs
const dlog = (...a) => DBG && console.log("🎯[ActItem]", ...a);
const pgroup = (label, fn) => {
  if (!(DBG && DBG_PRICE)) return fn();
  console.groupCollapsed(`💷[ActItem] ${label}`);
  try {
    fn();
  } finally {
    console.groupEnd();
  }
};
const pmoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `£${n}` : String(v);
};

// ──────────────────────────────────────────────────────────────────────────────
// Margin
// ──────────────────────────────────────────────────────────────────────────────
const MARGIN_RATE = 0.33;
const applyMargin = (v) => Math.ceil((Number(v) || 0) * (1 + MARGIN_RATE));

// ──────────────────────────────────────────────────────────────────────────────
// Core helpers
// ──────────────────────────────────────────────────────────────────────────────
const isHttp = (s) => typeof s === "string" && /^https?:\/\//i.test(s);

const getActId = (src) => src?.actId || src?._id || src?.id || "";
const getTitle = (src) => src?.tscName || src?.name || "Act";

const getImageUrl = (src) => {
  const v =
    src?.imageUrl ||
    src?.profileImage?.[0]?.url ||
    src?.profileImage?.url ||
    src?.images?.[0]?.url ||
    src?.images?.[0] ||
    src?.image ||
    "";

  if (typeof v === "string" && (isHttp(v) || v.startsWith("/"))) return v;
  return "/placeholder.jpg";
};

const getBadge = (src) => src?.availabilityBadge || null;

const getBasePrice = (src) => {
  if (src?.basePrice != null) return Number(String(src.basePrice).replace(/[^0-9.+-]/g, ""));
  const lineup = src?.lineups?.[0] || null;
  const base = src?.formattedPrice?.total ?? lineup?.base_fee?.[0]?.total_fee ?? null;
  return base != null ? Number(String(base).replace(/[^0-9.+-]/g, "")) : null;
};

const getLove = (src, shortlistCount) => {
  const n =
    src?.loveCount ??
    src?.timesShortlisted ??
    src?.numberOfShortlistsIn ??
    shortlistCount ??
    src?.shortlistCount ??
    src?.metrics?.shortlists ??
    0;
  return Math.max(0, Number(n) || 0);
};

// Manual override: stable “from” price if provided
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

  const n = v == null ? null : Number(String(v).replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const getSlug = (src) => {
  const s = src?.slug || src?.tscSlug || src?.routeSlug || src?.key || "";
  return typeof s === "string" ? s.trim() : "";
};

const getActUrl = (src) => {
  const slug = getSlug(src);
  const id = getActId(src);
  return slug ? `/act/${encodeURIComponent(slug)}` : id ? `/act/${id}` : "/";
};

// ──────────────────────────────────────────────────────────────────────────────
// Travel model normalizers (ActCards may store these under travelModel)
// ──────────────────────────────────────────────────────────────────────────────
const getTravelModel = (src) => src?.travelModel || src?.travelModelHints || null;

const num = (v) => (v == null ? 0 : Number(String(v).replace(/[^0-9.+-]/g, "")) || 0);

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
  if (cf && typeof cf === "object" && Object.keys(cf).length > 0) return true;
  return Boolean(tm?.hasCountyFees);
};

// ──────────────────────────────────────────────────────────────────────────────
// Derived base fallback (when no location/date OR missing base_fee)
// ──────────────────────────────────────────────────────────────────────────────
const essentialRolesFee = (member) => {
  const roles = Array.isArray(member?.additionalRoles) ? member.additionalRoles : [];
  return roles.reduce((s, r) => s + (r?.isEssential ? num(r?.additionalFee) : 0), 0);
};

const isManagerMember = (member) => /manager/i.test(String(member?.instrument || ""));

const minCountyFeeFromAct = (act) => {
  const useCounty = getUseCountyTravelFee(act);
  const countyFees = getCountyFees(act);
  if (!(useCounty && countyFees && typeof countyFees === "object")) return 0;
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

  const sorted = [...lineups].sort((a, b) => {
    const na = Array.isArray(a?.bandMembers) ? a.bandMembers.length : Number.POSITIVE_INFINITY;
    const nb = Array.isArray(b?.bandMembers) ? b.bandMembers.length : Number.POSITIVE_INFINITY;
    if (na !== nb) return na - nb;
    return lineupBareFee(a) - lineupBareFee(b);
  });

  const chosen = sorted[0];
  if (!chosen) return null;

  const members = Array.isArray(chosen.bandMembers) ? chosen.bandMembers : [];

  const memberBreakdown = members.map((m, idx) => {
    const fee = num(m?.fee);
    const essential = essentialRolesFee(m);
    const total = fee + essential;
    const roles = Array.isArray(m?.additionalRoles)
      ? m.additionalRoles
          .filter((r) => r?.isEssential)
          .map((r) => ({ role: r?.customRole || r?.role || "Role", fee: num(r?.additionalFee) }))
      : [];

    return {
      idx,
      name: m?.firstName ? `${m.firstName}${m?.lastName ? ` ${m.lastName}` : ""}` : undefined,
      instrument: m?.instrument,
      isManager: isManagerMember(m),
      fee,
      essentialRolesFee: essential,
      essentialRoles: roles,
      memberTotal: total,
    };
  });

  const memberFees = memberBreakdown.reduce((s, x) => s + (Number(x.memberTotal) || 0), 0);
  const travelCount = memberBreakdown.reduce((n, m) => n + (m.isManager ? 0 : 1), 0);
  const travelUnit = minCountyFeeFromAct(act);
  const travel = (Number(travelUnit) || 0) * (Number(travelCount) || 0);
  const total = memberFees + travel;

  pgroup(`Derived base (no when/where) — ${getTitle(act)} (${getActId(act)})`, () => {
    dlog("chosen lineup snapshot", {
      act: getTitle(act),
      lineupLabel: chosen?.act_size || chosen?.actSize || null,
      memberCount: members.length,
      useCountyTravelFee: getUseCountyTravelFee(act),
      hasCountyFees: getHasCountyFees(act),
    });
    dlog("member breakdown", memberBreakdown);
    dlog("travel breakdown", { travelCount, travelUnit, travel });
    dlog("totals (pre-margin)", { memberFees, travel, total });
  });

  return Number.isFinite(total) ? total : null;
};

const PriceSkeleton = () => <div className="h-5 w-24 rounded-md bg-gray-200 animate-pulse" />;

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────
const ActItem = ({ actData, shortlistCount }) => {
  const {
    shortlistedActs,
    shortlistAct,
    userId,
    selectedCounty,
    selectedAddress,
    selectedDate,
    getCardPriceWithTravel,
  } = useContext(ShopContext) || {};

  const [isAnimating, setIsAnimating] = useState(false);
  const [loveCount, setLoveCount] = useState(() => getLove(actData, shortlistCount));
  const [price, setPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // keep latest handler refs stable
  const getCardPriceWithTravelRef = useRef(getCardPriceWithTravel);
  useEffect(() => {
    getCardPriceWithTravelRef.current = getCardPriceWithTravel;
  }, [getCardPriceWithTravel]);

  // Sync love count to incoming data
  useEffect(() => {
    setLoveCount(getLove(actData, shortlistCount));
  }, [actData, shortlistCount]);

  // Pricing key (primitive) to prevent recalcing on every render/object identity change
  const actId = useMemo(() => String(getActId(actData)), [actData]);
  const actVer = useMemo(() => String(actData?.updatedAt || actData?.__v || ""), [actData]);
  const addrNorm = useMemo(() => String(selectedAddress || "").trim(), [selectedAddress]);
  const hasAddress = useMemo(() => !!addrNorm, [addrNorm]);

  const dateISO = useMemo(() => {
    if (!selectedDate) return "";
    const d = new Date(selectedDate);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }, [selectedDate]);

  const pricingKey = useMemo(() => {
    const county = String(selectedCounty || "");
    return `${actId}|${actVer}|${county}|${addrNorm}|${dateISO}`;
  }, [actId, actVer, selectedCounty, addrNorm, dateISO]);

  const safeSetPrice = useCallback((next) => {
    setPrice((prev) => {
      const prevTotal = prev?.total ?? null;
      const nextTotal = next?.total ?? null;
      const prevTC = !!prev?.travelCalculated;
      const nextTC = !!next?.travelCalculated;
      if (prevTotal === nextTotal && prevTC === nextTC) return prev;
      return next;
    });
  }, []);

  // Compute/refresh price (debounced by pricingKey)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadingPrice(true);
      try {
        const baseOnly = getBasePrice(actData);
        const manualMin = !hasAddress || !dateISO ? getMinDisplayPrice(actData) : null;
        const hasLineups = Array.isArray(actData?.lineups) && actData.lineups.length > 0;

        pgroup(`Price build — ${getTitle(actData)} (${actId})`, () => {
          dlog("inputs", {
            id: actId,
            title: getTitle(actData),
            hasLineups,
            baseOnly,
            manualMin,
            selectedCounty: selectedCounty || null,
            selectedAddress: selectedAddress || null,
            selectedDate,
            dateISO,
            useCountyTravelFee: getUseCountyTravelFee(actData),
            travelModeHints: {
              useMUTravelRates: getUseMUTravelRates(actData),
              useCountyTravelFee: getUseCountyTravelFee(actData),
              costPerMile: getCostPerMile(actData),
              hasCountyFees: getHasCountyFees(actData),
            },
          });
        });

        // 1) No when/where → stable “from” price
        if (!hasAddress || !dateISO) {
          if (manualMin != null) {
            // NOTE: manualMin assumed NET or already display-ready. If your API stores NET,
            // you probably want margin here. If manualMin is already post-margin, keep as-is.
            // I’m following your earlier behaviour: no extra margin applied.
            if (!cancelled) safeSetPrice({ total: manualMin, travelCalculated: false, isManual: true });
            return;
          }

          const derived = computeBaseFromSmallestLineup(actData);
          if (derived != null) {
            if (!cancelled) safeSetPrice({ total: applyMargin(derived), travelCalculated: false });
            return;
          }

          if (baseOnly != null) {
            if (!cancelled) safeSetPrice({ total: applyMargin(baseOnly), travelCalculated: false });
            return;
          }

          if (!cancelled) safeSetPrice(null);
          return;
        }

        // 2) We have when/where
        // If this is a lightweight card (no lineups), try context helper
        if (!hasLineups) {
          const fn = getCardPriceWithTravelRef.current;
          if (typeof fn === "function") {
            try {
              const totalNet = await fn(actId);
              if (!cancelled && Number.isFinite(totalNet)) {
                safeSetPrice({ total: applyMargin(totalNet), travelCalculated: true });
                return;
              }
            } catch (err) {
              dlog("card travel-aware pricing failed", err?.message || err);
            }
          }

          if (!cancelled && baseOnly != null) safeSetPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          return;
        }

        // 3) Full act doc pricing
        const countyFees = getCountyFees(actData);
        const hasCountyTable = Boolean(
          getUseCountyTravelFee(actData) &&
            countyFees &&
            typeof countyFees === "object" &&
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

        if (cancelled) return;

        if (!result || result.total == null) {
          if (baseOnly != null) safeSetPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          return;
        }

        safeSetPrice({ ...result, total: applyMargin(result.total), travelCalculated: true });
      } catch (err) {
        console.error("❌ Failed to calculate price:", {
          err,
          actId,
          useCountyTravelFee: actData?.useCountyTravelFee,
        });
        const baseOnly = getBasePrice(actData);
        if (!cancelled && baseOnly != null) safeSetPrice({ total: applyMargin(baseOnly), travelCalculated: false });
        if (!cancelled && baseOnly == null) safeSetPrice(null);
      } finally {
        if (!cancelled) setLoadingPrice(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [pricingKey, actData, actId, hasAddress, dateISO, selectedCounty, selectedAddress, selectedDate, safeSetPrice]);

  // UI display total
  const computedFallback = useMemo(() => {
    // used if price is null
    const manualMin = !hasAddress || !dateISO ? getMinDisplayPrice(actData) : null;
    if (manualMin != null) return manualMin;

    const derived = computeBaseFromSmallestLineup(actData);
    if (derived != null) return applyMargin(derived);

    const b = getBasePrice(actData);
    if (b != null) return applyMargin(b);

    return null;
  }, [actData, hasAddress, dateISO]);

  const rawTotal = price?.total ?? computedFallback;

  useEffect(() => {
    pgroup(`UI total — ${getTitle(actData)} (${actId})`, () => {
      if (!(DBG && DBG_PRICE)) return;
      dlog("price state", price);
      dlog("fallback (post-margin)", computedFallback);
      dlog("UI rawTotal", rawTotal);
    });
  }, [actId, actData, price, computedFallback, rawTotal]);

  const displayTotal = useMemo(() => {
    if (rawTotal == null) return null;
    const n = Number(String(rawTotal).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }, [rawTotal]);

  // Heart click (fixes your duplicated setLoveCount bug + no decrements)
  const handleHeartClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      setIsAnimating(true);

      const isShortlistedNow = Array.isArray(shortlistedActs) && shortlistedActs.includes(actId);

      // ✅ Only bump when adding. Never decrement.
      setLoveCount((prev) => {
        const safe = Number(prev) || 0;
        return isShortlistedNow ? safe : safe + 1;
      });

      shortlistAct?.(userId || null, actId);

      setTimeout(() => setIsAnimating(false), 300);
    },
    [actId, shortlistedActs, shortlistAct, userId]
  );

  const formatLoveCount = (count) => {
    const n = Number(count) || 0;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    return n;
  };

  const isShortlisted = Array.isArray(shortlistedActs) && shortlistedActs.includes(actId);

  // Badge photo priority (if matches selected date)
  const badge = getBadge(actData) || {};
  const selectedISO = dateISO || null;
  const badgeDateISO = badge?.dateISO || null;
  const badgeActive = Boolean(badge?.active);
  const badgeHasPhoto = Boolean(badge?.photoUrl);
  const badgeMatches = Boolean(badgeActive && badgeDateISO && selectedISO && badgeDateISO === selectedISO);
  const resolvedImage = badgeMatches && badgeHasPhoto ? badge.photoUrl : getImageUrl(actData);

  return (
    <div className="relative group">
      <Link
        to={getActUrl(actData)}
        onClick={() => {
          if (typeof window !== "undefined") window.scrollTo(0, 0);
        }}
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

            <div className="act-price min-h-[20px]">
              {loadingPrice ? (
                <PriceSkeleton />
              ) : displayTotal !== null ? (
                price?.travelCalculated ? `£${displayTotal}` : `from £${displayTotal}`
              ) : (
                "Loading price..."
              )}
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end justify-between min-h-[40px]">
            <button
              type="button"
              onClick={handleHeartClick}
              disabled={isAnimating}
              className="p-1 transition-transform duration-150 ease-in-out"
              aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
              title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
            >
              {isShortlisted ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-1 -1 34 32"
                  className={`w-6 h-6 transition-transform ${isAnimating ? "scale-125" : ""}`}
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
                  className={`w-6 h-6 transition-transform ${isAnimating ? "scale-125" : ""}`}
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

            <p className={`text-xs ${loveCount === 0 ? "text-gray-400" : "text-gray-700"} text-center w-full self-center lg:self-end`}>
              {loveCount === 0 ? "love me" : `${formatLoveCount(loveCount)} ${loveCount === 1 ? "love" : "loves"}`}
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

export default React.memo(ActItem, (prev, next) => {
  const prevId = String(getActId(prev.actData));
  const nextId = String(getActId(next.actData));
  const prevVer = String(prev.actData?.updatedAt || prev.actData?.__v || "");
  const nextVer = String(next.actData?.updatedAt || next.actData?.__v || "");
  return prevId === nextId && prevVer === nextVer && prev.shortlistCount === next.shortlistCount;
});