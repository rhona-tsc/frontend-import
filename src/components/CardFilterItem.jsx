// frontend/src/components/CardFilterActItem.jsx
import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Link } from "react-router-dom";
import calculateActPricing from "../pages/utils/pricing";
import { ShopContext } from "../context/ShopContext";

const MARGIN_RATE = 0.33;
const applyMargin = (v) => Math.ceil((Number(v) || 0) * (1 + MARGIN_RATE));

const getActId = (src) => src?.actId || src?._id || src?.id || "";
const getTitle = (src) => src?.tscName || src?.name || "Act";
const isHttp = (s) => typeof s === "string" && /^https?:\/\//i.test(s);

const normalizeAddrStrict = (s = "") =>
  String(s || "")
    .toLowerCase()
    .replace(/\buk\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/,\s*/g, ",")
    .trim();

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

const getLove = (src, fallback) => {
  const n = src?.timesShortlisted ?? src?.loveCount ?? fallback ?? 0;
  return Math.max(0, Number(n) || 0);
};

const getBadge = (src) => src?.availabilityBadge || null;

const getBasePrice = (src) => {
  if (src?.basePrice != null) {
    return Number(String(src.basePrice).replace(/[^0-9.+-]/g, ""));
  }
  const lineup = src?.lineups?.[0] || null;
  const base = src?.formattedPrice?.total ?? lineup?.base_fee?.[0]?.total_fee ?? null;
  return base != null ? Number(String(base).replace(/[^0-9.+-]/g, "")) : null;
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

// ——— helpers for fallback base calculation ———
const num = (v) => (v == null ? 0 : Number(String(v).replace(/[^0-9.+-]/g, "")) || 0);

const essentialRolesFee = (member) => {
  const roles = Array.isArray(member?.additionalRoles) ? member.additionalRoles : [];
  return roles.reduce((s, r) => s + (r?.isEssential ? num(r?.additionalFee) : 0), 0);
};

const isManagerMember = (m) => /manager/i.test(String(m?.instrument || ""));

const minCountyFeeFromAct = (act) => {
  if (!(act?.useCountyTravelFee && act?.countyFees && typeof act.countyFees === "object")) return 0;
  const vals = Object.values(act.countyFees)
    .map(Number)
    .filter((v) => Number.isFinite(v) && v > 0);
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

/**
 * Notes on the “glitching” fix:
 * - compute a primitive pricingKey and only recompute when it changes
 * - keep deps stable (effect depends ONLY on pricingKey)
 * - cancel in-flight async work on rapid changes
 * - avoid extra state churn (don’t set price repeatedly to same value)
 */
const CardFilterItem = ({ actData, timesShortlisted, standalone = false, onPriceComputed }) => {
  const ctx = useContext(ShopContext) || {};
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
  const [loveCount, setLoveCount] = useState(() => getLove(actData, timesShortlisted));
  const [price, setPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // keep latest callbacks without forcing effect reruns
  const onPriceComputedRef = useRef(onPriceComputed);
  useEffect(() => {
    onPriceComputedRef.current = onPriceComputed;
  }, [onPriceComputed]);

  const getCardPriceWithTravelRef = useRef(getCardPriceWithTravel);
  useEffect(() => {
    getCardPriceWithTravelRef.current = getCardPriceWithTravel;
  }, [getCardPriceWithTravel]);

  // keep latest act + context values in refs (so pricing effect can depend only on pricingKey)
  const actDataRef = useRef(actData);
  useEffect(() => {
    actDataRef.current = actData;
  }, [actData]);

  const ctxRef = useRef({ selectedCounty, selectedAddress, selectedDate });
  useEffect(() => {
    ctxRef.current = { selectedCounty, selectedAddress, selectedDate };
  }, [selectedCounty, selectedAddress, selectedDate]);

  const incomingLove = useMemo(
    () => getLove(actData, timesShortlisted),
    [actData?.timesShortlisted, actData?.loveCount, timesShortlisted]
  );

  useEffect(() => {
    setLoveCount((prev) => (prev === incomingLove ? prev : incomingLove));
  }, [incomingLove]);

  const actId = useMemo(() => String(getActId(actData)), [actData]);
  const actVer = useMemo(() => String(actData?.updatedAt || actData?.__v || ""), [actData]);

  const addrNorm = useMemo(() => normalizeAddrStrict(selectedAddress || ""), [selectedAddress]);

  const dateISO = useMemo(() => {
    if (!selectedDate) return "";
    const d = new Date(selectedDate);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }, [selectedDate]);

  // Only recompute pricing when these change
  const pricingKey = useMemo(() => {
    const county = String(selectedCounty || "");
    const mode = standalone ? "standalone" : "card";
    return `${mode}|${actId}|${actVer}|${county}|${addrNorm}|${dateISO}`;
  }, [standalone, actId, actVer, selectedCounty, addrNorm, dateISO]);

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

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadingPrice(true);

      try {
        const a = actDataRef.current;
        const { selectedCounty: county, selectedAddress: addr, selectedDate: dt } = ctxRef.current;

        const addrN = normalizeAddrStrict(addr || "");
        const dateStr = (() => {
          if (!dt) return "";
          const d = new Date(dt);
          return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
        })();

        const baseOnly = getBasePrice(a);
        const hasLineups = Array.isArray(a?.lineups) && a.lineups.length > 0;
        const hasAnyLocation = !!(addrN || county);
        const hasDate = !!dateStr;

        // 1) Standalone cards: stable “from” price (no travel calc)
        if (standalone) {
          if (baseOnly != null) {
            if (!cancelled) safeSetPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          } else {
            const derived = computeBaseFromSmallestLineup(a);
            if (derived != null && !cancelled) {
              safeSetPrice({ total: applyMargin(derived), travelCalculated: false });
            }
          }
          return;
        }

        // 2) Missing location/date → show “from” price
        if (!hasAnyLocation || !hasDate) {
          const derived = computeBaseFromSmallestLineup(a);
          if (derived != null) {
            if (!cancelled) safeSetPrice({ total: applyMargin(derived), travelCalculated: false });
          } else if (baseOnly != null) {
            if (!cancelled) safeSetPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          } else {
            if (!cancelled) safeSetPrice(null);
          }
          return;
        }

        // 3) No lineups → try context helper (if provided), else fallback to base
        if (!hasLineups) {
          const fn = getCardPriceWithTravelRef.current;
          if (typeof fn === "function") {
            try {
              const totalNet = await fn(actId);
              if (!cancelled && Number.isFinite(totalNet)) {
                safeSetPrice({ total: applyMargin(totalNet), travelCalculated: true });
                return;
              }
            } catch {
              // swallow and fallback below
            }
          }

          if (!cancelled && baseOnly != null) {
            safeSetPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          }
          return;
        }

        // 4) Full pricing with travel
        const hasCountyTable = !!(
          a?.useCountyTravelFee &&
          a?.countyFees &&
          typeof a.countyFees === "object" &&
          Object.keys(a.countyFees).length > 0
        );

        const lineup = a.lineups[0];

        const result = await calculateActPricing(
          a,
          hasCountyTable ? county : null,
          addrN,
          dateStr,
          lineup
        );

        if (cancelled) return;

        if (!result || result.total == null) {
          if (baseOnly != null) safeSetPrice({ total: applyMargin(baseOnly), travelCalculated: false });
          return;
        }

        safeSetPrice({
          ...result,
          total: applyMargin(result.total),
          travelCalculated: true,
        });
      } catch (err) {
        console.error("❌ Failed to calculate price:", {
          err,
          actId,
          useCountyTravelFee: actDataRef.current?.useCountyTravelFee,
        });

        const baseOnly = getBasePrice(actDataRef.current);
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
    // Intentionally depend on ONE primitive key to prevent “glitching” from churny deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingKey]);

  const computedFallback = useMemo(() => {
    const b = getBasePrice(actData);
    if (b != null) return applyMargin(b);
    const derived = computeBaseFromSmallestLineup(actData);
    if (derived != null) return applyMargin(derived);
    return null;
  }, [actData]);

  const rawTotal = price?.total != null ? price.total : computedFallback;

  const displayTotal = useMemo(() => {
    if (rawTotal == null) return null;
    const n = Number(String(rawTotal).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }, [rawTotal]);

  // Lift computed price up for sorting etc.
  useEffect(() => {
    if (standalone) return;
    if (loadingPrice) return;
    if (displayTotal == null) return;
    onPriceComputedRef.current?.(actId, displayTotal);
  }, [actId, displayTotal, loadingPrice, standalone]);

  const handleHeartClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (standalone) return;

      setIsAnimating(true);

      const isShortlistedNow = (shortlistedActs || []).includes(actId);

      // loveCount represents timesShortlisted UI
      setLoveCount((prev) => {
        const safe = Number(prev) || 0;
        return isShortlistedNow ? Math.max(0, safe - 1) : safe + 1;
      });

      // Let ShopContext handle guest/local vs authed/server
      shortlistAct?.(userId || null, actId);

      setTimeout(() => setIsAnimating(false), 300);
    },
    [standalone, shortlistedActs, shortlistAct, userId, actId]
  );

  const isShortlisted = standalone ? false : (shortlistedActs || []).includes(actId);

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
              disabled={isAnimating || standalone}
              className="p-1 transition-transform duration-150 ease-in-out"
              aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
              title={
                standalone
                  ? "Shortlist disabled here"
                  : isShortlisted
                  ? "Remove from shortlist"
                  : "Add to shortlist"
              }
            >
              {!standalone && isShortlisted ? (
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

            <p
              className={`text-xs ${
                loveCount === 0 ? "text-gray-400" : "text-gray-700"
              } text-center w-full self-center lg:self-end`}
            >
              {loveCount === 0
                ? "love me"
                : `${loveCount >= 1000
                    ? (loveCount / 1000).toFixed(1).replace(/\.0$/, "") + "K"
                    : loveCount
                  } ${loveCount === 1 ? "love" : "loves"}`}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};

// Memo to reduce rerenders from parent list churn
export default React.memo(CardFilterItem, (prev, next) => {
  const prevId = String(getActId(prev.actData));
  const nextId = String(getActId(next.actData));
  const prevVer = String(prev.actData?.updatedAt || prev.actData?.__v || "");
  const nextVer = String(next.actData?.updatedAt || next.actData?.__v || "");
  const sameCore = prevId === nextId && prevVer === nextVer;

  // We *don’t* include onPriceComputed in the comparison.
  return (
    sameCore &&
    prev.timesShortlisted === next.timesShortlisted &&
    prev.standalone === next.standalone
  );
});