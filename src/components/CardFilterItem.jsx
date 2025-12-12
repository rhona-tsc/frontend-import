// frontend/src/components/CardFilterActItem.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import calculateActPricing from "../pages/utils/pricing";
import { ShopContext } from "../context/ShopContext";

const DBG = true;

const getActId = (src) => src?.actId || src?._id || src?.id || "";
const getTitle = (src) => src?.tscName || src?.name || "Act";
const getImageUrl = (src) => {
  const v = src?.imageUrl || src?.profileImage?.[0]?.url || "";
  return v && v.startsWith("http") ? v : "/placeholder.jpg";
};
const getBadge = (src) => src?.availabilityBadge || null;
const getLove = (src, shortlistCount) => {
  const n =
    src?.loveCount ??
    src?.numberOfShortlistsIn ??
    shortlistCount ??
    src?.shortlistCount ??
    src?.metrics?.shortlists ??
    0;
  return Math.max(0, Number(n) || 0);
};

const formatMoney = (v) =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v).toLocaleString("en-GB") : null;

const CardFilterItem = ({
  actData,
  shortlistCount,
  standalone = false,
  sourceTag = "unknown",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Try to read context, but allow absence in standalone mode
  let ctx = {};
  try {
    ctx = useContext(ShopContext) || {};
  } catch {
    ctx = {};
  }

  const {
    shortlistedActs,
    shortlistAct,
    userId,
    selectedCounty,
    selectedAddress,
    selectedDate,
  } = ctx;

  const [isAnimating, setIsAnimating] = useState(false);
  const [loveCount, setLoveCount] = useState(() => getLove(actData, shortlistCount));
  const [price, setPrice] = useState(null); // { total, travelCalculated }
  const [loadingPrice, setLoadingPrice] = useState(true);

  const calcSeq = useRef(0); // guard against stale async responses

  useEffect(() => {
    setLoveCount(getLove(actData, shortlistCount));
  }, [
    actData?.loveCount,
    actData?.numberOfShortlistsIn,
    actData?.shortlistCount,
    actData?.metrics?.shortlists,
    shortlistCount,
  ]);

  // Compute/refresh price — single source of truth is calculateActPricing
  useEffect(() => {
    let cancelled = false;
    const seq = ++calcSeq.current;

    const run = async () => {
      try {
        setLoadingPrice(true);

        const lineup =
          Array.isArray(actData?.lineups) && actData.lineups.length
            ? actData.lineups[0]
            : null;

        // Always call util; it applies the margin and handles missing addr/date
        const result = await calculateActPricing(
          actData,
          selectedCounty || null,
          selectedAddress || null,
          selectedDate || null,
          lineup
        );

        if (cancelled || calcSeq.current !== seq) return;
        if (DBG) console.log("🟢 Card price result", { id: getActId(actData), result });

        // DO NOT add margin here — util already returns a price with the margin applied
        setPrice(result && Number.isFinite(result.total) ? result : null);
      } catch (err) {
        console.error("❌ Failed to calculate price:", {
          err,
          actId: getActId(actData),
        });
        if (cancelled || calcSeq.current !== seq) return;
        setPrice(null);
      } finally {
        if (!cancelled && calcSeq.current === seq) setLoadingPrice(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [actData, selectedCounty, selectedAddress, selectedDate]);

  const displayTotal = formatMoney(price?.total);

  const handleHeartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (standalone) return; // disabled
    if (!userId) {
      const fromActsListing = String(location.pathname || "").startsWith("/acts");
      const listUrl =
        `${location.pathname || ""}${location.search || ""}${location.hash || ""}` ||
        "/acts";
      const actUrl = getActId(actData) ? `/act/${getActId(actData)}` : "/";
      const fallback = fromActsListing ? listUrl : actUrl;
      sessionStorage.setItem("postLoginNext", fallback);
      navigate("/login", { state: { from: fallback } });
      return;
    }

    setIsAnimating(true);
    const isShortlistedNow = (shortlistedActs || []).includes(String(getActId(actData)));
    // optimistic bump
    setLoveCount((prev) => {
      const safe = Number(prev) || 0;
      return isShortlistedNow ? Math.max(0, safe - 1) : safe + 1;
    });
    shortlistAct?.(userId, getActId(actData));
    setTimeout(() => setIsAnimating(false), 300);
  };

  const isShortlisted = standalone
    ? false
    : (shortlistedActs || []).includes(String(getActId(actData)));

  const badge = getBadge(actData) || {};
  const selectedISO = selectedDate ? new Date(selectedDate).toISOString().slice(0, 10) : null;
  const badgeDateISO = badge?.dateISO || null;
  const badgeActive = Boolean(badge?.active);
  const badgeHasPhoto = Boolean(badge?.photoUrl);
  const badgeMatches = Boolean(
    badgeActive && badgeDateISO && selectedISO && badgeDateISO === selectedISO
  );
  const resolvedImage =
    badgeMatches && badgeHasPhoto ? badge.photoUrl : getImageUrl(actData);

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

            <div className="act-price min-h-[20px]">
              {loadingPrice ? (
                <span className="inline-block h-4 w-24 rounded bg-gray-200 animate-pulse" />
              ) : displayTotal !== null ? (
                price?.travelCalculated ? `£${displayTotal}` : `from £${displayTotal}`
              ) : (
                "—"
              )}
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end justify-between min-h-[40px]">
            <button
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
              {(!standalone && isShortlisted) ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-1 -1 34 32"
                  className={`w-6 h-6 transition-transform ${
                    isAnimating ? "scale-125" : ""
                  }`}
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
                  className={`w-6 h-6 transition-transform ${
                    isAnimating ? "scale-125" : ""
                  }`}
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
                : `${loveCount >= 1000 ? (loveCount / 1000).toFixed(1).replace(/\.0$/, "") + "K" : loveCount
                  } ${loveCount === 1 ? "love" : "loves"}`}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default CardFilterItem;