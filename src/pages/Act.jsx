import React, { useContext, useState, useEffect, useRef, Suspense } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/assets";
import calculateActPricing from "./utils/pricing";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CustomToast from "../components/CustomToast";
import ActHero from "../components/ActHero";
import ReviewCard from "../components/ReviewCard";
import Title from "../components/Title";
import { getPossessiveTitleCase } from "./utils/getPossessiveTitleCase"; // adjust path as needed

import { priceCache, makePriceKey } from "./utils/priceCache";
import {
  FeaturedVocalistBadge,
  VocalistFeaturedAvailable,
} from "../components/FeaturedVocalistBadge";
import {
  paMap,
  lightMap,
  generateDescription,
  numberToWords,
  formatDate,
  fetchBadgeForActAndDate,
  calculateAverageRating,
} from "./utils/helpersforAct";
import useRenderTracker from "../hooks/useRenderTracker";
 import { logBadges } from "../utils/logger";
import { readCachedAct, writeCachedAct } from "../utils/actCache";

const Act = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const location = useLocation();

  // Extract YouTube video ID from a full URL or return as-is if already an ID
  const extractVideoId = (url) => {
    if (!url) return "";
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : url;
  };
  const { actId } = useParams();
  const {
    acts,
    getActById,
    addToCart,
    selectedDate,
    setSelectedDate,
    selectedAddress,
    setSelectedAddress,
    setShowSearch,
    userId,
    shortlistAct,
    shortlistedActs,
    cartItems,
    removeFromCart,
    handleDateOrAddressChange,
    selectedCounty,
  } = useContext(ShopContext);
  const [actData, setActData] = useState(null);
  const [isYesForSelectedDate, setIsYesForSelectedDate] = useState(null);
  const [selectedLineup, setSelectedLineup] = useState("");
  const [video, setVideo] = useState("");
  const navigate = useNavigate();
  const storedPlace = sessionStorage.getItem("selectedPlace") || "";
  const [formattedPrice, setFormattedPrice] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [finalTravelPrice, setFinalTravelPrice] = useState(null);
  // 🧹 Track locally cleared availability badges
  const [clearedBadges, setClearedBadges] = useState(new Set());
  const [price, setPrice] = useState(null);

  // 🔎 Prefer reviews, fall back to tscReviews/testimonials
const reviews = React.useMemo(() => {
  if (Array.isArray(actData?.reviews) && actData.reviews.length) return actData.reviews;
  if (Array.isArray(actData?.tscReviews) && actData.tscReviews.length) return actData.tscReviews;
  if (Array.isArray(actData?.testimonials) && actData.testimonials.length) return actData.testimonials;
  return [];
}, [actData]);

// 🎵 Prefer selectedSongs, else flatten repertoireByYear, else repertoire
const selectedSongs = React.useMemo(() => {
  if (Array.isArray(actData?.selectedSongs) && actData.selectedSongs.length) return actData.selectedSongs;

  // flatten { [year]: [{title,artist,genre,...}, ...] }
  if (actData?.repertoireByYear && typeof actData.repertoireByYear === "object") {
    return Object.entries(actData.repertoireByYear).flatMap(([year, arr]) =>
      (arr || []).map(s => ({ ...s, year }))
    );
  }
  if (Array.isArray(actData?.repertoire) && actData.repertoire.length) return actData.repertoire;
  if (Array.isArray(actData?.tscRepertoire) && actData.tscRepertoire.length) return actData.tscRepertoire;
  return [];
}, [actData]);

// ⭐ Recompute average rating from the same reviews you render
const averageRating = React.useMemo(() => {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((a, r) => a + (Number(r.rating) || 0), 0);
  return Math.round((sum / reviews.length) * 2) / 2; // nearest 0.5
}, [reviews]);

// at top of Act.jsx
const RepertoireSectionLazy = React.lazy(() => import("../components/RepertoireSection"));
const AcousticExtrasSelectorLazy = React.lazy(() => import("../components/AcousticExtrasSelector"));
const ActPerformanceOverviewLazy = React.lazy(() => import("../components/ActPerformanceOverview"));
const RelatedActsLazy = React.lazy(() => import("../components/RelatedActs"));
const DEBUG = import.meta?.env?.DEV ?? false; // on in dev
const log = (...a) => { if (DEBUG) console.log(...a); };


  useRenderTracker("Act", {
  actId,
  hasActData: !!actData,
  lineupCount: actData?.lineups?.length || 0,
  selectedDate: selectedDate ? selectedDate.slice(0,10) : null,
  hasAddress: !!selectedAddress,
  badgeKeys: Object.keys(actData?.availabilityBadges || {}).length,
});

  const id = extractVideoId(video);
const cld = (url, w = 900) =>
  typeof url === "string" && url.includes("/upload/")
    ? url.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`)
    : url;

  // 🔺 Pre-compute hero URL for high-priority preload/render
  const heroUrlHigh = React.useMemo(() => {
    try {
      const u = actData?.images?.[0]?.url || "";
      return u ? cld(u, 1600) : "";
    } catch { return ""; }
  }, [actData?.images]);

  // Gallery Carousel logic
  const galleryRef = useRef(null);
  const reviewGalleryRef = useRef(null); // ✅ fix
// at top of the component
const sseRef = React.useRef(null);
const lastActIdRef = React.useRef(null);
  const scrollGallery = (direction) => {
    if (galleryRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      galleryRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const scrollReviews = (direction) => {
  if (reviewGalleryRef.current) {
    const amt = direction === "left" ? -400 : 400;
    reviewGalleryRef.current.scrollBy({ left: amt, behavior: "smooth" });
  }
};
function VisibleOnScroll({ children, rootMargin = "200px", once = true }) {
  const [show, setShow] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    // If already shown (and once=true), don’t re-observe
    if (show && once) return;

    const el = ref.current;
    // Fallback if IO isn’t available (SSR/old browser)
    if (!el || typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          if (once) io.disconnect();
        }
      },
      { rootMargin }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [show, once, rootMargin]);

  return <div ref={ref}>{show ? children : null}</div>;
}

const badgeVersion = (b = {}) => {
  const keys = Object.keys(b);
  let latest = 0;
  for (const k of keys) {
    const t = new Date(b[k]?.setAt || 0).getTime();
    if (t > latest) latest = t;
  }
  return `${keys.length}:${latest}`;
};

useEffect(() => {
  if (!actData) return;

  setActData(prev => {
    if (!prev) return prev;

    const source = actData?.availabilityBadges || {};
    const filtered = { ...source };
    clearedBadges.forEach((d) => {
      delete filtered[d];
      delete filtered[`${d}_tbc`];
    });

    const prevV = badgeVersion(prev.availabilityBadges || {});
    const nextV = badgeVersion(filtered);

    if (prevV === nextV) return prev; // no change

    return { ...prev, ...actData, availabilityBadges: filtered };
  });
}, [actData?.availabilityBadges, clearedBadges]);

  useEffect(() => {
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [location]);

  // 🚀 Preconnect to Cloudinary once (improves TLS handshake for hero image)
  useEffect(() => {
    const host = "https://res.cloudinary.com";
    const add = (rel, attrs = {}) => {
      const el = document.createElement("link");
      el.rel = rel;
      el.setAttribute("data-auto", "act-hero");
      Object.entries(attrs).forEach(([k, v]) => v != null && el.setAttribute(k, String(v)));
      document.head.appendChild(el);
    };
    if (!document.head.querySelector('link[rel="preconnect"][href="https://res.cloudinary.com"]')) {
      add("preconnect", { href: host, crossOrigin: "" });
    }
    if (!document.head.querySelector('link[rel="dns-prefetch"][href="https://res.cloudinary.com"]')) {
      add("dns-prefetch", { href: host });
    }
  }, []);

  // 🖼️ Preload the hero image at high priority as soon as we know it
  useEffect(() => {
    if (!heroUrlHigh) return;
    // Avoid duplicates
    const existing = document.head.querySelector(`link[rel="preload"][as="image"][href="${heroUrlHigh}"]`);
    if (existing) return;
    const l = document.createElement("link");
    l.rel = "preload";
    l.as = "image";
    l.href = heroUrlHigh;
    l.setAttribute("fetchpriority", "high");
    l.setAttribute("data-auto", "act-hero-preload");
    document.head.appendChild(l);
    return () => {
      try { document.head.removeChild(l); } catch {}
    };
  }, [heroUrlHigh]);

  const promptLogin = (
    msg = "Please log in to save acts to your shortlist.",
    actId = null
  ) => {
    try {
      toast(<CustomToast type="info" message={msg} />);
    } catch {}

    const next = `${location.pathname}${location.search || ""}`;
    sessionStorage.setItem("postLoginNext", next);

    // 🆕 Store act ID so we can auto-add after login
    if (actId) sessionStorage.setItem("pendingShortlistActId", actId);

    navigate("/login");
  };

// Derive what you actually render
const visibleBadges = React.useMemo(() => {
  const base = actData?.availabilityBadges || {};
  if (!clearedBadges?.size) return base;

  const out = { ...base };
  clearedBadges.forEach((d) => {
    delete out[d];
    delete out[`${d}_tbc`];
  });
  return out;
}, [actData?.availabilityBadges, clearedBadges]);

useEffect(() => {
  if (!actId || !selectedDate || !actData) return;

  // keep the existing connection if it's already for this actId
  if (sseRef.current && lastActIdRef.current === String(actId)) return;

  // close any previous connection
  if (sseRef.current) {
    try { sseRef.current.close(); } catch {}
    sseRef.current = null;
  }

  const url = `${import.meta.env.VITE_BACKEND_URL}/api/availability/subscribe`;
  const es = new EventSource(url);
  sseRef.current = es;
  lastActIdRef.current = String(actId);

  const onMessage = async (e) => {
    try {
      const data = JSON.parse(e.data);
      if (!["availability_yes","availability_deputy_yes","availability_badge_updated"].includes(data.type)) return;
      if (String(data.actId) !== String(actId)) return;

      const cleanDate = (data.dateISO || "").slice(0,10) || (selectedDate || "").slice(0,10);
      if (!cleanDate) return;

      if (data.type === "availability_badge_updated" && data.badge === null) {
        setClearedBadges(prev => new Set(prev).add(cleanDate));
        return;
      }

      await refreshBadgeFor(cleanDate);
    } catch (err) {
      console.error("⚠️ SSE message error", err);
    }
  };

  const onError = (err) => console.warn("⚠️ SSE connection error", err);
  const onOpen = () => console.log("📡 [SSE] Connection established");

  es.addEventListener("message", onMessage);
  es.addEventListener("error", onError);
  es.addEventListener("open", onOpen);

  return () => {
    es.removeEventListener("message", onMessage);
    es.removeEventListener("error", onError);
    es.removeEventListener("open", onOpen);
    try { es.close(); } catch {}
    if (sseRef.current === es) {
      sseRef.current = null;
      lastActIdRef.current = null;
    }
  };
}, [actId, selectedDate, !!actData]);

useEffect(() => {
  if (!actId || !selectedDate || !actData) return;
  const cleanDate = selectedDate.slice(0,10);
  refreshBadgeFor(cleanDate);
}, [actId, selectedDate, !!actData]);

  // verify latest reply on this act+date (use stable actId to avoid stale state)
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        if (!actId || !selectedDate) {
          if (!abort) setIsYesForSelectedDate(null);
          return;
        }

        const base = (import.meta.env.VITE_BACKEND_URL || "").replace(
          /\/+$/,
          ""
        );
        const dateISO = new Date(selectedDate).toISOString().slice(0, 10);
        const u = new URL(`${base}/api/v2/availability/acts-by-dateV2`);
        u.searchParams.set("date", dateISO);
        u.searchParams.set("actId", String(actId));

        const resp = await fetch(u.toString(), {
          headers: { accept: "application/json" },
        });
        const text = await resp.text();
        let j = {};
        try {
          j = text ? JSON.parse(text) : {};
        } catch {
          j = {};
        }
        if (!resp.ok) throw new Error(`availability ${resp.status}`);

        if (!abort) {
          // tolerate different shapes; prefer explicit latestReply
          const latest = j?.latestReply || j?.latest || j?.reply || null;
          setIsYesForSelectedDate(
            latest === "yes" ? true : latest === "no" ? false : null
          );
        }
      } catch (e) {
        if (!abort) setIsYesForSelectedDate(null);
      }
    })();
    return () => {
      abort = true;
    };
  }, [actId, selectedDate]);

  // Touch/swipe gesture support for gallery carousel (images)
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    let startX = 0;
    let scrollLeft = 0;
    let isDown = false;

    const onTouchStart = (e) => {
      isDown = true;
      startX = e.touches[0].pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onTouchMove = (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX - el.offsetLeft;
      const walk = startX - x;
      el.scrollLeft = scrollLeft + walk;
    };
    const onTouchEnd = () => {
      isDown = false;
    };
    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchmove", onTouchMove);
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const el = reviewGalleryRef.current;
    if (!el) return;
    let startX = 0;
    let scrollLeft = 0;
    let isDown = false;

    const onTouchStart = (e) => {
      isDown = true;
      startX = e.touches[0].pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onTouchMove = (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX - el.offsetLeft;
      const walk = startX - x;
      el.scrollLeft = scrollLeft + walk;
    };
    const onTouchEnd = () => {
      isDown = false;
    };
    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchmove", onTouchMove);
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

// act loader
useEffect(() => {
  if (!actId) return;
  let cancelled = false;

  // paint from acts[] if present
  let found = Array.isArray(acts)
    ? acts.find(a => String(a._id) === String(actId))
    : null;
  if (found) {
    const avg = calculateAverageRating(found.reviews || []);
    setActData({ ...found, averageRating: avg });
    setSelectedLineup(found.lineups?.[0] || null);
    setVideo(found.videos?.[0]?.url || "");
  }

  // paint from cache if present
  const cached = readCachedAct(actId);
  if (cached) {
    const avg = calculateAverageRating(cached.reviews || []);
    setActData(prev => {
      const better = (cached?.lineups?.length || 0) >= (prev?.lineups?.length || 0) ? cached : prev;
      return better ? { ...better, averageRating: calculateAverageRating(better.reviews || []) } : prev;
    });
    setSelectedLineup(cached.lineups?.[0] || null);
    setVideo(cached.videos?.[0]?.url || "");
  }

  // fetch fresh — accept both response shapes
  (async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/act/${actId}`, {
        headers: { accept: "application/json" },
      });
      const text = await res.text();
      if (cancelled) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = text ? JSON.parse(text) : null;

      // ✅ tolerate: { success, act }  OR  { ...actFields }
      const act =
        (json && json.act) ? json.act :
        (json && json._id) ? json :
        null;

      if (!act) {
        console.warn("[Act] Unexpected payload for /api/act/:id", json);
        return;
      }

      writeCachedAct(actId, act);
      const avg = calculateAverageRating(act.reviews || []);
      setActData({ ...act, averageRating: avg });

      const firstLineup = Array.isArray(act.lineups) ? act.lineups[0] : null;
      setSelectedLineup(firstLineup || null);

      // prefer videos[], fall back to tscVideos[]
      const v = (act.videos?.[0]?.url) || (act.tscVideos?.[0]?.url) || "";
      setVideo(v);
    } catch (e) {
      console.error("[Act] fetch failed", e);
    }
  })();

  return () => { cancelled = true; };
}, [actId, acts]);

  const [shouldFetchPrice, setShouldFetchPrice] = useState(true);

const priceReqKey = React.useRef("");

async function handleLineupChange(lineup){
  setSelectedLineup(lineup);
  const lineupId = lineup?._id || lineup?.lineupId;
  const key = `${actData?._id}|${lineupId}|${selectedDate}|${selectedAddress}|${selectedCounty||""}`;
  priceReqKey.current = key;

  const result = await calculateActPricing(/*...*/);
  if (priceReqKey.current !== key) return; // discard stale result
  if (result) { setPrice({ ...result, travelCalculated: result?.travelFeeTotal > 0 }); }
}

  useEffect(() => {
    if (!actData?.lineups?.length) {
      // show base if available and bail
      const lineup = actData?.lineups?.[0];
      const base =
        actData?.formattedPrice?.total ??
        lineup?.base_fee?.[0]?.total_fee ??
        null;
      if (base != null) {
        setPrice({
          total: Number(String(base).replace(/[^0-9.+-]/g, "")),
          travelCalculated: false,
        });
      }
      return;
    }

    const hasAnyLocation = !!(selectedAddress || selectedCounty);
    if (!selectedDate || !hasAnyLocation) {
      const lineup = actData.lineups[0];
      const base =
        actData?.formattedPrice?.total ??
        lineup?.base_fee?.[0]?.total_fee ??
        null;
      if (base != null) {
        setPrice({
          total: Number(String(base).replace(/[^0-9.+-]/g, "")),
          travelCalculated: false,
        });
      }
      return;
    }

    const hasCountyTable =
      actData.useCountyTravelFee &&
      actData.countyFees &&
      Object.keys(actData.countyFees).length > 0;

    const lineup = actData.lineups[0];

    const key = makePriceKey({
      actId: actData._id,
      lineupId: lineup?._id || lineup?.lineupId,
      dateISO: selectedDate,
      address: selectedAddress || "",
      county: hasCountyTable ? selectedCounty : "",
    });

    const cached = priceCache.get(key);
    if (cached) {
      setPrice(cached);
      setFinalTravelPrice(cached);
      return;
    }

    (async () => {
      try {
        const pricingResults = await calculateActPricing(
          actData,
          hasCountyTable ? selectedCounty : null,
          selectedAddress,
          selectedDate,
          lineup
        );

        const base =
          actData?.formattedPrice?.total ??
          lineup?.base_fee?.[0]?.total_fee ??
          0;

        const final =
          pricingResults && pricingResults.total != null
            ? pricingResults
            : {
                total: Number(String(base).replace(/[^0-9.+-]/g, "")),
                travelCalculated: false,
              };

        priceCache.set(key, final);
        setFinalTravelPrice(final);
        setPrice({
          total: final.total,
          travelCalculated: !!final.travelCalculated,
          travelFeeTotal: final.travelFeeTotal ?? 0,
        });
      } catch (err) {
        console.error("❌ Failed to calculate price:", {
          err,
          actId: actData?._id,
          useCountyTravelFee: actData?.useCountyTravelFee,
        });
        const base =
          actData?.formattedPrice?.total ??
          lineup?.base_fee?.[0]?.total_fee ??
          null;
        if (base != null) {
          const fallback = {
            total: Number(String(base).replace(/[^0-9.+-]/g, "")),
            travelCalculated: false,
          };
          setPrice(fallback);
          setFinalTravelPrice(fallback);
        }
      }
    })();
  }, [
    actData?._id,
    actData?.lineups?.length,
    actData?.useCountyTravelFee,
    actData?.countyFees && Object.keys(actData.countyFees).length,
    selectedCounty,
    selectedAddress,
    selectedDate,
  ]);

  const badgeReqKeyRef = React.useRef("");

const versionOf = (b = {}) => {
  let latest = 0, n = 0;
  for (const k of Object.keys(b)) {
    n++;
    const t = new Date(b[k]?.setAt || 0).getTime();
    if (t > latest) latest = t;
  }
  return `${n}:${latest}`;
};

async function refreshBadgeFor(dateYYYYMMDD) {
  if (!actId || !dateYYYYMMDD) return;
  const key = `${actId}|${dateYYYYMMDD}`;
  badgeReqKeyRef.current = key;

  const badge = await fetchBadgeForActAndDate(actId, dateYYYYMMDD);
  if (badgeReqKeyRef.current !== key) return; // stale result – ignore

  // no-op if same version
  setActData(prev => {
    if (!prev) return prev;
    const prevBadges = prev.availabilityBadges || {};
    const nextBadges = { ...prevBadges, [dateYYYYMMDD]: badge };

    if (versionOf(prevBadges) === versionOf(nextBadges)) return prev;
    return { ...prev, availabilityBadges: nextBadges };
  });
}

  // Calculate display price: prefer price?.total, then formattedPrice, then actData formattedPrice
  const rawTotal =
    price?.total ?? formattedPrice ?? actData?.formattedPrice?.total ?? null;
  const displayTotal =
    rawTotal != null
      ? Number(String(rawTotal).replace(/[^0-9.+-]/g, ""))
      : null;

  // Check if the act is already in the cart
  const isInCart =
    actData &&
    cartItems[actData._id] &&
    Object.keys(cartItems[actData._id]).length > 0;

  // Derived cart lineup and comparison (for sticky cart button)
  const cartLineupId =
    actData && cartItems[actData._id]
      ? Object.keys(cartItems[actData._id])[0] || null
      : null;
  const selectedLineupId =
    selectedLineup?._id || selectedLineup?.lineupId || null;
  const isSameLineupAsCart =
    !!cartLineupId &&
    !!selectedLineupId &&
    String(cartLineupId) === String(selectedLineupId);

  // Is this act currently shortlisted?
  const isShortlisted =
    Array.isArray(shortlistedActs) && actData?._id
      ? shortlistedActs.includes(actData._id)
      : false;

// ✅ new: render as soon as actData exists; handle "no lineup" gracefully
if (!actData) {
  return <div className="p-4 text-gray-500">Loading act details...</div>;
}

// use a safe local reference everywhere you read selectedLineup
const safeSelectedLineup = selectedLineup || actData.lineups?.[0] || null;
console.log("[Act] counts", { reviews: reviews.length, songs: selectedSongs.length });

  return (
    <div className="p-4">
      {/* Top Navigation */}
      <div className="flex justify-between items-center mb-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-black"
        >
          ← Back
        </button>

        <div>
          {" "}
          {/* ✅ Date & Venue Selection */}
          {selectedDate && selectedAddress ? (
            <p className="text-sm mt-3 p-2 text-gray-500">
              Showing results for:
              <span className="text-gray-700">
                {" "}
                {formatDate(selectedDate)} at{" "}
                {storedPlace && `${storedPlace}, `}
                {selectedAddress}
              </span>
              <span
                onClick={() => setShowSearch(true)}
                className="text-blue-600 cursor-pointer underline ml-2"
              >
                edit date and/or venue
              </span>
            </p>
          ) : (
            <p className="text-sm mt-3 p-2 text-gray-500 justify-center">
              Please select a date and location for an accurate price and
              availability
              <span
                onClick={() => setShowSearch(true)}
                className="text-blue-600 cursor-pointer underline ml-2"
              >
                add my date and location
              </span>
            </p>
          )}
        </div>
        <div></div>
      </div>
      {/* Eagerly fetch the hero image so it is not lazy-loaded by the browser */}
      {heroUrlHigh && (
        <img
          src={heroUrlHigh}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          width={1}
          height={1}
          style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
          aria-hidden="true"
        />
      )}

      <ActHero actId={actId} acts={acts} act={actData} heroUrl={heroUrlHigh} eager />
      <div className="border-t-2 pt-10 transition-opacity ease-in duration-500 opacity-100">
        <div className="flex flex-col sm:flex-row gap-6 w-full">
          {/* Left: Video & Bio stacked together */}
          <div className="w-full sm:w-[60%] ">
            {/* Video section */}
            <div className="aspect-video">
              <div className="text-2xl mt-6">
                <Title
                  text1={getPossessiveTitleCase(actData?.tscName)}
                  text2="VIDEOS"
                />
              </div>
              {(() => {
                const selectedVideoId = extractVideoId(video);
                return (
                  <div className="relative aspect-video rounded overflow-hidden">
                    {!playing ? (
                      <button
                        type="button"
                        className="group w-full h-full relative"
                        onClick={() => setPlaying(true)}
                        aria-label="Play video"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${selectedVideoId}/hqdefault.jpg`}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="rounded-full p-4 bg-black/50 group-hover:bg-black/70 transition">
                            {/* play triangle */}
                            <svg
                              width="36"
                              height="36"
                              viewBox="0 0 24 24"
                              fill="#fff"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </span>
                      </button>
                    ) : (
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&modestbranding=1&rel=0&controls=1`}
                        title="YouTube player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                  </div>
                );
              })()}
            </div>
            {/* Video thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
              {actData.videos?.map((videoObj, index) => {
                const videoId = extractVideoId(videoObj.url);
                return (
                  <img
                    key={index}
                    onClick={() => setVideo(videoObj.url)}
                    className="w-[80px] h-[56px] object-cover rounded cursor-pointer flex-shrink-0 border-2 border-transparent hover:border-[#ff6667] hover:shadow-md transition duration-200 rounded"
                    src={`https://img.youtube.com/vi/${videoId}/0.jpg`}
                    alt={videoObj.title || `Video ${index + 1}`}
                  />
                );
              })}
            </div>

            {/* Inclusions (mobile only) */}
            <div className="block sm:hidden">
              <div className="text-2xl mt-6" id="lineup-selector-mobile">
                <Title
                  text1={getPossessiveTitleCase(actData?.tscName)}
                  text2="INCLUSIONS"
                />
              </div>
              <div className="flex items-center gap-1 mt-2 pl-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <img
                    key={i}
                    className="w-3.5"
                    src={
                      actData.averageRating >= i
                        ? assets.star_icon
                        : actData.averageRating >= i - 0.5
                          ? assets.star_half_icon
                          : assets.star_dull_icon
                    }
                    alt={`Star ${i}`}
                  />
                ))}
                <p className="pl-2">({actData.reviews?.length || 0})</p>
              </div>
              {/* ✅ Sticky bar only on mobile */}
              {actData && (
                <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3 z-[9999]">
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator
                          .share({
                            title: actData?.tscName || "Act",
                            text: `Check out this amazing act: ${actData?.tscName}`,
                            url: window.location.href,
                          })
                          .catch((err) => console.error("Share failed:", err));
                      } else {
                        alert("Sharing not supported in this browser.");
                      }
                    }}
                    className="p-3 rounded-md bg-[#ff6667] text-white hover:bg-[#ff6667] active:bg-black transition"
                    aria-label="Share act"
                  >
                    {/* share icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-share-icon lucide-share"
                    >
                      <path d="M12 2v13" />
                      <path d="m16 6-4-4-4 4" />
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    </svg>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // 🔹 Check if user is logged in before proceeding
                        if (!userId) {
                          promptLogin(
                            "Please log in to save acts to your shortlist.",
                            actData._id
                          );
                          return;
                        }

                        // 🔹 Proceed with shortlist toggle
                        await shortlistAct(userId, actData._id);

                        toast(
                          <CustomToast
                            type="success"
                            message={
                              isShortlisted
                                ? `${actData.tscName || actData.name} removed from your shortlist.`
                                : `${actData.tscName || actData.name} added to your shortlist!`
                            }
                          />,
                          {
                            position: "top-right",
                            autoClose: 1600,
                          }
                        );
                      } catch (e) {
                        console.error("❌ Shortlist toggle failed", e);
                        toast(
                          <CustomToast
                            type="error"
                            message="Could not update shortlist."
                          />,
                          {
                            position: "top-right",
                            autoClose: 1600,
                          }
                        );
                      }
                    }}
                    aria-pressed={isShortlisted}
                    className={`px-8 py-3 text-m rounded transition-colors ${
                      isShortlisted
                        ? "bg-white text-black border border-black hover:bg-[#ff6667] hover:text-white"
                        : "bg-black text-white hover:bg-[#ff6667]"
                    }`}
                  >
                    {isShortlisted
                      ? "REMOVE FROM SHORTLIST"
                      : "ADD TO SHORTLIST"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!safeSelectedLineup) {
                        console.warn(
                          "⚠️ No lineup selected before adding to cart"
                        );
                        return;
                      }

                      // --- existing add/remove logic below ---
                      if (!isInCart) {
                        addToCart(
                          actData._id,
                          safeSelectedLineup._id || safeSelectedLineup.lineupId
                        );
                        toast(
                          <CustomToast
                            type="success"
                            message="Added to cart!"
                          />,
                          { position: "top-right", autoClose: 1600 }
                        );
                        return;
                      }

                      if (isSameLineupAsCart) {
                        const lineupIds = Object.keys(
                          cartItems[actData._id] || {}
                        );
                        lineupIds.forEach((lineupId) =>
                          removeFromCart(actData._id, lineupId)
                        );
                        toast(
                          <CustomToast
                            type="success"
                            message="Removed from cart."
                          />,
                          { position: "top-right", autoClose: 1600 }
                        );
                      } else {
                        const lineupIds = Object.keys(
                          cartItems[actData._id] || {}
                        );
                        lineupIds.forEach((lineupId) =>
                          removeFromCart(actData._id, lineupId)
                        );
                        addToCart(
                          actData._id,
                          safeSelectedLineup._id || safeSelectedLineup.lineupId
                        );
                        toast(
                          <CustomToast
                            type="success"
                            message="Lineup updated in cart!"
                          />,
                          { position: "top-right", autoClose: 1600 }
                        );
                      }
                    }}
                    className="flex-1 px-4 py-3 rounded text-sm font-medium bg-black text-white hover:bg-[#ff6667] transition"
                    aria-pressed={!!isInCart}
                  >
                    {!isInCart
                      ? "ADD TO CART"
                      : isSameLineupAsCart
                        ? "REMOVE FROM CART"
                        : "UPDATE LINEUP"}
                  </button>
                </div>
              )}
              <p className="mt-5 text-3xl font-medium p-3">
                {(() => {
                  const rawTotal =
                    price?.total ??
                    formattedPrice ??
                    actData?.formattedPrice?.total ??
                    null;
                  const cleanTotal =
                    price?.total ??
                    finalTravelPrice?.total ??
                    actData?.formattedPrice ??
                    null;

                  // Prefer travelFeeTotal in price breakdowns if available
                  const travelFeeDisplay =
                    price?.travelFeeTotal ??
                    finalTravelPrice?.travelFeeTotal ??
                    null;

                  if (cleanTotal != null) {
                    return price?.travelCalculated ||
                      finalTravelPrice?.travelCalculated
                      ? `£${cleanTotal}`
                      : `from £${cleanTotal}`;
                  }
                  return "Loading price...";
                })()}
              </p>
              <div className="flex flex-col gap-4 my-2">
                <p className="text-lg text-gray-600 m-3">
                  {generateDescription(safeSelectedLineup) || "Add a Linuep"}
                </p>
                <div className="flex flex-wrap gap-2 text-lg justify-start ml-3">
                  {actData.lineups?.map((item, index) => {
                    const isSelected = item === safeSelectedLineup;
                    return (
                      <button
                        key={index}
                        onClick={() => handleLineupChange(item)}
                        className={`border py-2 px-4 rounded text-sm transition-colors duration-200 ${
                          isSelected
                            ? "bg-black text-white border-black"
                            : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-[#ff6667] hover:text-white hover:border-[#ff6667]"
                        }`}
                      >
                        {item?.actSize || `Lineup ${index + 1}`}
                      </button>
                    );
                  })}
                </div>
                <div className="my-3 mt-5">
                  <div className="my-3 mt-5"></div>
                </div>
                <p className="text-gray-600 text-lg ml-3">Including:</p>
                <ul className="list-disc pl-5 text-lg text-gray-600 ml-3">
                  <li>
                    Up to {actData?.numberOfSets?.[0]}x
                    {actData?.lengthOfSets?.[0]}
                    mins or {actData?.numberOfSets?.[1]}x
                    {actData?.lengthOfSets?.[1]}
                    mins live performance
                  </li>
                  <li>
                    {actData?.paSystem &&
                      `A ${paMap[actData.paSystem]} PA system `}
                    {actData?.lightingSystem && (
                      <>
                        {actData.paSystem && " and "}a{" "}
                        {lightMap[actData.lightingSystem]} lighting system to
                        light up your stage
                        {["mediumLight", "largeLight"].includes(
                          actData.lightingSystem
                        ) && " and dancefloor"}
                      </>
                    )}
                  </li>
                  <li>
                    The band on site for up to 7 hours or until midnight,
                    whichever comes first
                  </li>
                  {Object.entries(actData.extras || {})
                    .filter(
                      ([_, value]) =>
                        typeof value === "object" &&
                        value.complimentary === true
                    )
                    .map(([key]) => {
                      const formattedLabel = key
                        .replace(/_/g, " ")
                        .replace(/^\w/, (c) => c.toUpperCase());
                      return <li key={key}>{formattedLabel}</li>;
                    })}
                  {actData.offRepertoireRequests > 0 && (
                    <li>
                      {actData.offRepertoireRequests === 1
                        ? "One additional ‘off-repertoire’ song request (e.g. often the first dance or your favourite song)"
                        : `${actData.offRepertoireRequests} additional ‘off-repertoire’ song requests (e.g. often the first dance or your favourite songs)`}
                    </li>
                  )}
                  {actData?.setlist === "smallTailoring" && (
                    <li>
                      A signature setlist curated by the band — guaranteed
                      crowd-pleasers that they know work every time
                    </li>
                  )}
                  {actData?.setlist === "mediumTailoring" && (
                    <li>
                      A collaborative setlist blending your top picks with our
                      tried-and-tested favourites for the perfect party balance
                    </li>
                  )}
                  {actData?.setlist === "largeTailoring" && (
                    <li>
                      A fully tailored setlist made up almost entirely of your
                      requests — a truly personalised music experience
                    </li>
                  )}
                  {finalTravelPrice && selectedAddress?.trim() && (
                    <li>& travel to {selectedAddress}</li>
                  )}
                </ul>
              </div>

              <div className="my-3 mt-5 flex justify-left z-10">
                {(() => {
                  const allBadges = visibleBadges;
                 
logBadges("🐊 [Lookup] All badges", allBadges);

                  if (!allBadges || !selectedDate) {
                    console.warn("🐊 [Lookup] Missing badges or date");
                    return null;
                  }

                  const cleanDate = selectedDate.slice(0, 10);

                  const matchedKey = Object.keys(allBadges).find((k) =>
                    k.includes(cleanDate)
                  );

                  if (!matchedKey) {
                    console.warn("🐊 [Lookup] No badge matched date");
                    return null;
                  }

                  const badgeForDate = allBadges[matchedKey];
                 

                  const slots = Array.isArray(badgeForDate?.slots)
                    ? badgeForDate.slots
                    : [];
                  if (!slots.length) return null;

                  return (
               <div className="flex items-center gap-3 mt-2 flex-wrap">
  {slots.map((slot) => {
    const cacheBuster =
      slot?.primary?.setAt || slot?.setAt || badgeForDate?.setAt || "";


    return (
      <React.Fragment key={`${matchedKey}_slot_${slot.slotIndex}`}>
        {/* Primary bubble (auto-switches to a covering deputy with YES) */}
        <VocalistFeaturedAvailable
          slot={slot}
          size={140}
          cacheBuster={cacheBuster}
          className="mt-2"
        />

        {/* Deputies — force their own names so we never inherit the lead’s */}
       {/* Deputies — force their own names so we never inherit the lead’s */}
{Array.isArray(slot.deputies) &&
  slot.deputies.map((dep, i) => {
    // Prefer explicit deputy name fields only
    const rawDeputyName =
      (typeof dep.vocalistName === "string" && dep.vocalistName.trim()) ? dep.vocalistName.trim()
      : (typeof dep.displayName  === "string" && dep.displayName.trim())  ? dep.displayName.trim()
      : (typeof dep.preferredName=== "string" && dep.preferredName.trim())? dep.preferredName.trim()
      : "";

    const short = (full) => {
      const parts = String(full || "").trim().split(/\s+/);
      if (!parts.length) return "";
      if (parts.length === 1) return parts[0];
      const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase() || "";
      return `${parts[0]} ${lastInitial}`;
    };

    const displayName = short(rawDeputyName);

    return (
      <FeaturedVocalistBadge
        key={`${matchedKey}_slot_${slot.slotIndex}_dep_${dep.musicianId || i}`}
        imageUrl={dep.photoUrl || assets?.placeholderMusician}
        size={120}
        cacheBuster={dep.setAt || dep.repliedAt || slot.setAt || ""}
        className="mt-2"
        musicianId={dep.musicianId}
        profileUrl={dep.profileUrl}
        variant="deputy"
        displayName={displayName}
      />
    );
  })}
      </React.Fragment>
    );
  })}
</div>
                  );
                })()}
              </div>
            </div>
            {/* Bio section */}
            <div className="mt-6">
              <div className="flex">
                <div className="text-2xl mt-6">
                  <Title
                    text1={getPossessiveTitleCase(actData?.tscName)}
                    text2="BIOGRAPHY"
                  />
                </div>
              </div>
              <div className="px-2 py-2 text-gray-600 text-lg sm:text-xl leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: actData.tscBio }} />
              </div>
            </div>
          </div>
          {/* Right Column: Act Info */}
          <div className="hidden sm:block sm:w-[40%]">
            <div className="text-2xl mt-6" id="lineup-selector">
              <Title
                text1={getPossessiveTitleCase(actData?.tscName)}
                text2="INCLUSIONS"
              />
            </div>
            {/* Star rating with full, half, and empty stars */}
            <div className="flex items-center gap-1 mt-2 pl-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <img
                  key={i}
                  className="w-3.5"
                  src={
                    actData.averageRating >= i
                      ? assets.star_icon
                      : actData.averageRating >= i - 0.5
                        ? assets.star_half_icon
                        : assets.star_dull_icon
                  }
                  alt={`Star ${i}`}
                />
              ))}
              <p className="pl-2">({actData?.reviews?.length || 0})</p>
            </div>

            <p className="mt-5 text-3xl font-medium p-3">
              {(() => {
                const rawTotal =
                  price?.total ??
                  formattedPrice ??
                  actData?.formattedPrice?.total ??
                  null;
                const cleanTotal =
                  rawTotal != null
                    ? Number(String(rawTotal).replace(/[^0-9.+-]/g, ""))
                    : null;

                // Prefer travelFeeTotal in price breakdowns if available
                const travelFeeDisplay =
                  price?.travelFeeTotal ??
                  finalTravelPrice?.travelFeeTotal ??
                  null;

                if (cleanTotal != null) {
                  return price?.travelCalculated ||
                    finalTravelPrice?.travelCalculated
                    ? `£${cleanTotal}`
                    : `from £${cleanTotal}`;
                }
                return "Loading price...";
              })()}
            </p>

            {/* ✅ Lineup Selection (Now Updates Price Instantly) */}
            <div className="flex flex-col gap-4 my-2">
              <p className="text-lg text-gray-600 m-3">
                {generateDescription(safeSelectedLineup) || "Add a Linuep"}
              </p>
              <div className="flex flex-wrap gap-2 text-lg justify-start ml-3">
                {actData.lineups?.map((item, index) => {
                  const isSelected = item === safeSelectedLineup;

                  return (
                    <button
                      key={index}
                      onClick={() => handleLineupChange(item)}
                      className={`border py-2 px-4 rounded text-sm transition-colors duration-200
          ${
            isSelected
              ? "bg-black text-white border-black"
              : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-[#ff6667] hover:text-white hover:border-[#ff6667]"
          }
        `}
                    >
                      {item?.actSize || `Lineup ${index + 1}`}
                    </button>
                  );
                })}
              </div>

              <p className="text-gray-600 text-lg ml-3">Including:</p>
              <ul className="list-disc pl-5 text-lg text-gray-600 ml-3">
                <li>
                  Up to {actData?.numberOfSets?.[0] || "?"}x
                  {actData?.lengthOfSets?.[0] || "?"}mins or{" "}
                  {actData?.numberOfSets?.[1] || "?"}x
                  {actData?.lengthOfSets?.[1] || "?"}mins live performance
                </li>
                <li>
                  {actData?.paSystem &&
                    `A ${paMap[actData?.paSystem]} PA system `}
                  {actData?.lightingSystem && (
                    <>
                      {actData?.paSystem && " and "}a{" "}
                      {lightMap[actData?.lightingSystem]} lighting system to
                      light up your stage
                      {["mediumLight", "largeLight"].includes(
                        actData?.lightingSystem
                      ) && " and dancefloor"}
                    </>
                  )}
                </li>
                <li>
                  The band on site for up to 7 hours or until midnight,
                  whichever comes first
                </li>
                {Object.entries(actData.extras || {})
                  .filter(
                    ([_, value]) =>
                      typeof value === "object" && value.complimentary === true
                  )
                  .map(([key]) => {
                    const formattedLabel = key
                      .replace(/_/g, " ") // Replace underscores with spaces
                      .replace(/^\w/, (c) => c.toUpperCase()); // Capitalize only the first character of the string

                    return <li key={key}>{formattedLabel}</li>;
                  })}
                {actData.offRepertoireRequests > 0 && (
                  <li>
                    {actData.offRepertoireRequests === 1
                      ? "One additional ‘off-repertoire’ song request (e.g. often the first dance or your favourite song)"
                      : `${numberToWords(actData.offRepertoireRequests)} additional ‘off-repertoire’ song requests (e.g. often the first dance or your favourite songs)`}
                  </li>
                )}
                {actData?.setlist === "smallTailoring" && (
                  <li>
                    A signature setlist curated by the band — guaranteed
                    crowd-pleasers that they know work every time
                  </li>
                )}
                {actData?.setlist === "mediumTailoring" && (
                  <li>
                    A collaborative setlist blending your top picks with our
                    tried-and-tested favourites for the perfect party balance
                  </li>
                )}
                {actData?.setlist === "largeTailoring" && (
                  <li>
                    A fully tailored setlist made up almost entirely of your
                    requests — a truly personalised music experience
                  </li>
                )}
                {finalTravelPrice && selectedAddress?.trim() && (
                  <li>& travel to {selectedAddress}</li>
                )}
              </ul>
            </div>
            {/* move this block ABOVE or BELOW the .block sm:hidden */}
            <div className="my-3 mt-5 flex justify-left z-10">
              {(() => {
                const allBadges = visibleBadges;
                if (!allBadges || !selectedDate) return null;

                const cleanDate = selectedDate.slice(0, 10);
                const badgeKey = Object.keys(allBadges).find((k) =>
                  k.includes(cleanDate)
                );
                if (!badgeKey) return null;

                const badgeForDate = allBadges[badgeKey];
                const slots = badgeForDate?.slots || [];
                if (!slots.length) return null;

                const isHttp = (u) =>
                  typeof u === "string" && u.startsWith("http");
                const isYes = (d) =>
                  d?.state === "yes" ||
                  d?.reply === "yes" ||
                  d?.available === true;
                const uniqBy = (arr, getKey) => {
                  const seen = new Set();
                  const out = [];
                  for (const item of arr) {
                    const key = getKey(item);
                    if (!key || seen.has(key)) continue;
                    seen.add(key);
                    out.push(item);
                  }
                  return out;
                };

                // OPTIONAL: if you want "lead-first across all slots", use sortedSlots instead of slots below
                const sortedSlots = [...slots].sort((a, b) => {
                  const aLead =
                    a?.state === "yes" && isHttp(a?.photoUrl) ? 1 : 0;
                  const bLead =
                    b?.state === "yes" && isHttp(b?.photoUrl) ? 1 : 0;
                  return bLead - aLead; // any slot with a lead-YES comes first
                });

                return (
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {sortedSlots /* or slots */
                      .map((slot) => {
                        // 🏷 Cart badge name formatting: First + Last initial

                        // 🏷 Short-name helper (no dot after the initial)
                        const shortName = (full = "") => {
                          const cleaned = String(full)
                            .trim()
                            .replace(/\s+/g, " ");
                          if (!cleaned) return "";
                          const parts = cleaned.split(" ");
                          if (parts.length === 1) return parts[0];
                          const first = parts[0];
                          const last = parts[parts.length - 1].replace(
                            /[^A-Za-zÀ-ÿ'-]/g,
                            ""
                          );
                          const initial = last ? last[0].toUpperCase() : "";
                          return initial ? `${first} ${initial}` : first;
                        };

                        const deps = Array.isArray(slot.deputies)
                          ? slot.deputies
                          : [];

                        // 1) lead (featured) item IF available and has photo – always prepend
                        const leadIsAvailable = slot?.state === "yes";
                        const leadHasPhoto = isHttp(slot?.photoUrl);
                        const leadItem =
                          leadIsAvailable && leadHasPhoto
                            ? {
                                isDeputy: false,
                                musicianId: slot.musicianId,
                                photoUrl: slot.photoUrl,
                                profileUrl: slot.profileUrl,
                                setAt: slot.setAt,
                                vocalistName: slot.vocalistName || "", // ← carry name for lead
                              }
                            : null;

                        // 2) server primary only if it's a deputy (but lead still goes first)
                        const primaryDep =
                          slot?.primary &&
                          slot.primary.isDeputy &&
                          isHttp(slot.primary.photoUrl)
                            ? (() => {
                                const match = deps.find(
                                  (d) =>
                                    String(d.musicianId) ===
                                    String(slot.primary.musicianId)
                                );
                                return {
                                  ...slot.primary,
                                  vocalistName:
                                    match?.vocalistName || match?.name || "",
                                }; // ← attach name
                              })()
                            : null;

                        // 3) YES deputies (newest first)
                        const yesDeps = deps
                          .filter((d) => isYes(d) && isHttp(d?.photoUrl))
                          .sort(
                            (a, b) =>
                              new Date(b.repliedAt || b.setAt || 0) -
                              new Date(a.repliedAt || a.setAt || 0)
                          );

                        // Build render list & de-dupe
                        const combined = [
                          ...(leadItem ? [leadItem] : []),
                          ...(primaryDep ? [primaryDep] : []),
                          ...yesDeps.filter(
                            (d) =>
                              !primaryDep ||
                              String(d.musicianId) !==
                                String(primaryDep.musicianId)
                          ),
                        ];

                        let renderList = uniqBy(combined, (d) =>
                          String(d.musicianId)
                        ).slice(0, 3);

                        // fallback: any deputy with a photo
                        if (!renderList.length) {
                          const firstWithPhoto = deps.find((d) =>
                            isHttp(d?.photoUrl)
                          );
                          if (firstWithPhoto)
                            renderList = [
                              { ...firstWithPhoto, isDeputy: true },
                            ];
                        }

                        if (!renderList.length) return null;

                        return (
                          <div
                            key={`${badgeKey}_slotwrap_${slot.slotIndex}`}
                            className="flex items-center gap-3 flex-wrap"
                          >
                            {renderList.map((item, idx) => {
                              const cache =
                                item.setAt ||
                                slot.setAt ||
                                badgeForDate.setAt ||
                                "";
                              const prof =
                                item.profileUrl ||
                                (item.musicianId
                                  ? `${window.location.origin}/musician/${item.musicianId}`
                                  : "");

                              // 🔤 Name resolution: **deputy-first** to avoid inheriting the lead name
                              const slotVocalistName = slot.vocalistName || "";
                              const deputy = item.isDeputy ? item : null;

                              // Prefer the deputy's own fields; only fall back to the lead name if this item is the lead
                              const deputyFirstLabel = [
                                item.displayName,
                                item.vocalistName,
                                item.preferredName,
                                item.depName,
                                item.deputyName,
                                item.musicianName,
                                deputy?.displayName,
                                deputy?.vocalistName,
                                deputy?.preferredName,
                                deputy?.depName,
                                deputy?.deputyName,
                              ].find((v) => typeof v === "string" && v.trim());

                              const label = deputyFirstLabel || (!item.isDeputy ? slotVocalistName : "");
                              const displayName = shortName(label || "");


                              return (
                                <FeaturedVocalistBadge
                                  key={`${badgeKey}_slot_${slot.slotIndex}_${String(item.musicianId || idx)}`}
                                  imageUrl={item.photoUrl}
                                  size={140}
                                  cacheBuster={cache}
                                  className="mt-2"
                                  musicianId={String(item.musicianId || "")}
                                  profileUrl={prof}
                                  variant={item.isDeputy ? "deputy" : "lead"}
                                  displayName={displayName}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                  </div>
                );
              })()}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row my-6 gap-6 ml-3">
              <button
                onClick={async () => {
                  try {
                    // 🔹 Check if user is logged in before proceeding
                    if (!userId) {
                      promptLogin(
                        "Please log in to save acts to your shortlist.",
                        actData._id
                      );
                      return;
                    }

                    // 🔹 Proceed with shortlist toggle
                    await shortlistAct(userId, actData._id);

                    toast(
                      <CustomToast
                        type="success"
                        message={
                          isShortlisted
                            ? `${actData.tscName || actData.name} removed from your shortlist.`
                            : `${actData.tscName || actData.name} added to your shortlist!`
                        }
                      />,
                      {
                        position: "top-right",
                        autoClose: 1600,
                      }
                    );
                  } catch (e) {
                    console.error("❌ Shortlist toggle failed", e);
                    toast(
                      <CustomToast
                        type="error"
                        message="Could not update shortlist."
                      />,
                      {
                        position: "top-right",
                        autoClose: 1600,
                      }
                    );
                  }
                }}
                aria-pressed={isShortlisted}
                className={`px-8 py-3 text-m rounded transition-colors ${
                  isShortlisted
                    ? "bg-white text-black border border-black hover:bg-[#ff6667] hover:text-white"
                    : "bg-black text-white hover:bg-[#ff6667]"
                }`}
              >
                {isShortlisted ? "REMOVE FROM SHORTLIST" : "ADD TO SHORTLIST"}
              </button>

              <button
                onClick={async () => {
                  if (!safeSelectedLineup) {
                    console.warn("⚠️ No lineup selected before adding to cart");
                    return;
                  }

                  // --- existing add/remove logic below ---
                  if (isInCart) {
                    // remove all lineups for this act
                    const lineupIds = Object.keys(cartItems[actData._id] || {});
                    lineupIds.forEach((lineupId) =>
                      removeFromCart(actData._id, lineupId)
                    );

                    toast(
                      <CustomToast
                        type="success"
                        message="Removed from cart."
                      />,
                      { position: "top-right", autoClose: 1600 }
                    );
                  } else {
                    // add selected lineup
                    addToCart(
                      actData._id,
                      safeSelectedLineup._id || safeSelectedLineup.lineupId
                    );
                    toast(
                      <CustomToast type="success" message="Added to cart!" />,
                      { position: "top-right", autoClose: 1600 }
                    );
                  }
                }}
                className="bg-black text-white px-8 py-3 text-m active:bg-gray-700 hover:bg-[#ff6667] transition-colors duration-200 rounded"
                aria-pressed={!!isInCart}
              >
                {isInCart ? "REMOVE FROM CART" : "ADD TO CART"}
              </button>
            </div>
          </div>
        </div>

        <div className="full">
          <div className="text-2xl mt-12">
            <Title
              text1={getPossessiveTitleCase(actData?.tscName)}
              text2="GALLERY"
            />
          </div>
          <div className="relative px-5 py-3">
            {actData.images?.length > 0 ? (
              <div className="relative">
                <button
                  onClick={() => scrollGallery("left")}
                  className="absolute -left-6 top-1/2 transform -translate-y-1/2 z-10 text-3xl text-gray-800 hover:text-black transition-colors"
                  aria-label="Scroll left"
                  type="button"
                >
                  <img
                    src={assets.scroll_left_icon}
                    alt="Scroll right"
                    className="w-6 h-6 md:w-8 md:h-8"
                  />
                </button>
                <div
                  ref={galleryRef}
                  className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
                  style={{ scrollBehavior: "smooth" }}
                >
                  {(actData.images || []).map((imgObj, index) => (
  <img
    key={index}
    src={cld(imgObj?.url, 900)}
    loading="lazy"
    decoding="async"
    width={900}
    height={600}
    className="w-[600px] h-[400px] object-cover rounded shadow-sm flex-shrink-0 snap-start"
    alt={`Gallery image ${index + 1}`}
  />
))}
                </div>
                <button
                  onClick={() => scrollGallery("right")}
                  className="absolute -right-6 top-1/2 transform -translate-y-1/2 z-10 text-3xl text-gray-800 hover:text-black transition-colors"
                  aria-label="Scroll right"
                  type="button"
                >
                  <img
                    src={assets.scroll_right_icon}
                    alt="Scroll right"
                    className="w-6 h-6 md:w-8 md:h-8"
                  />
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400 px-0 py-3">
                No gallery images available.
              </p>
            )}
          </div>
        </div>

        {/* Left Column (60%) */}
        <div className="flex flex-col sm:flex-row gap-12 mt-10">
          <div className="w-full">
           <Suspense fallback={null}>
  <VisibleOnScroll>
    <RepertoireSectionLazy
      selectedSongs={selectedSongs}
      actData={actData}
      addToCart={addToCart}
    />
  </VisibleOnScroll>
</Suspense>
          </div>
        </div>
        {/* Reviews horizontal scroll gallery */}
        <div className="relative mt-12">
          <div className="text-2xl mb-2">
            <Title
              text1={getPossessiveTitleCase(actData?.tscName)}
              text2="REVIEWS"
            />
          </div>

          {/* Reviews scroll area with background */}
          <div className="relative p-6">
            {actData.images?.[1]?.url && (
              <div className="absolute inset-0 z-0">
                <img
                  src={actData.images[1].url}
                  alt="Reviews background"
                  className="w-full h-full object-cover opacity-10"
                />
              </div>
            )}

            {/* Foreground content */}
            <div className="relative z-10">
              {actData.reviews?.length > 0 ? (
                <div className="relative ">
                  <button
                    onClick={() => scrollReviews("left")}
                    className="absolute -left-6 top-1/2 transform -translate-y-1/2 z-10 text-3xl text-gray-600 hover:text-black transition-colors"
                    aria-label="Scroll left"
                    type="button"
                  >
                    <img
                      src={assets.scroll_left_icon}
                      alt="Scroll left"
                      className="w-6 h-6 md:w-8 md:h-8"
                    />
                  </button>
                  <div
                    ref={reviewGalleryRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory px-4"
                    style={{ scrollBehavior: "smooth" }}
                  >
                   {reviews.length > 0 ? (
  // map over `reviews`
  reviews.map((review, index) => (
    <div key={index} className="flex-shrink-0 snap-start">
      <ReviewCard review={review} />
    </div>
  ))
) : (
  <p className="text-sm text-gray-400 px-0 py-3">No reviews available.</p>
)}
                  </div>
                  <button
                    onClick={() => scrollReviews("right")}
                    className="absolute -right-6 top-1/2 transform -translate-y-1/2 z-10 text-3xl text-gray-600 hover:text-black transition-colors"
                    aria-label="Scroll right"
                    type="button"
                  >
                    <img
                      src={assets.scroll_right_icon}
                      alt="Scroll right"
                      className="w-6 h-6 md:w-8 md:h-8"
                    />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 px-0 py-3">
                  No reviews available.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 mt-12 lg:gap-8">
          <div
            className="w-full lg:w-1/2 relative lg:-top-16 lg:pt-16"
            id="ceremony-afternoon-sets"
          >
            <div className="text-2xl mb-2">
              <Title
                text1={getPossessiveTitleCase(actData?.tscName)}
                text2="ACOUSTIC SETS"
              />
            </div>
            <div className="relative overflow-visible">
              {/* Foreground component */}
              <div className="relative z-10">
                {(() => {
                  return (
                   <Suspense fallback={null}>
  <VisibleOnScroll>
    <AcousticExtrasSelectorLazy
      actData={actData}
      lineups={actData.lineups}
      safeSelectedLineup={safeSelectedLineup}
      addToCart={addToCart}
      safeSelectedLineupId={safeSelectedLineup?._id}
    />
  </VisibleOnScroll>
</Suspense>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2">
            <div className="text-2xl mb-2">
              <Title
                text1={getPossessiveTitleCase(actData?.tscName)}
                text2="EXTRA SERVICES"
              />
            </div>
            <div className="relative ">
              {/* Extas Right Column (40%) */}
              <div className="flex-1">
                <div className="border rounded px-4 py-6 text-m text-gray-700 w-full my-2 sm:px-6 sm:py-6">
                  {actData.extras &&
                    Object.entries(actData.extras).map(([key, value]) => {
                      // Only render extras that contain a numeric value.price
                      const price =
                        typeof value === "object"
                          ? value.price
                          : parseFloat(value);
                      if (!price || isNaN(price)) return null;

                      const fee = price;
                      // Use the actual safeSelectedLineup size for per-member extras
                      const selectedLineupSize = parseInt(
                        safeSelectedLineup?.actSize ||
                          safeSelectedLineup?.bandMembers?.length ||
                          0
                      );
                      const name = actData.name || "this act";

                      const perMemberKeys = [
                        "extra_30min_performance_per_band_member",
                        "extra_40min_performance_per_band_member",
                        "extra_60min_performance_per_band_member",
                        "israeli_dancing_20mins_per_band_member",
                        "late_stay_60min_per_band_member",
                        "early_arrival_60min_per_band_member",
                        "extra_song_request_per_band_member",
                      ];

                      const rawFinalFee =
                        perMemberKeys.includes(key) && selectedLineupSize
                          ? fee * selectedLineupSize
                          : perMemberKeys.includes(key)
                            ? null
                            : fee;

                      const finalFee =
                        rawFinalFee !== null && !isNaN(rawFinalFee)
                          ? Math.ceil(rawFinalFee * 1.2)
                          : null;

                      if (finalFee === null || isNaN(finalFee)) return null;

                      // Improved normalization: collapse multiple underscores, ignore case, trim, treat underscores/dashes/spaces equally
                      const normalizeKey = (key) => {
                        return key
                          .toLowerCase()
                          .replace(/[\s\-]+/g, "_") // replace spaces and dashes with underscore
                          .replace(/_+/g, "_") // collapse multiple underscores
                          .replace(/[^\w]+/g, "_") // non-word to underscore
                          .replace(/^_+|_+$/g, ""); // trim leading/trailing underscores
                      };

                      const fallbackLabel = key
                        .replace(/[_\-]+/g, " ")
                        .replace(/\bDJ\b/g, "DJ")
                        .replace(/\bPA\b/g, "PA")
                        .replace(/\b(\w)/g, (match) => match.toUpperCase());

                      const labelsMap = {
                        sound_engineering_for_another_act_with_your_acts_pa: `Sound Engineering for another act using ${actData.tscName}'s PA`,
                        speedy_setup: "Speedy 60min Setup & Soundcheck",
                        wired_mic_for_speeches: "Wired Mic for Speeches",
                        wireless_mic_for_speeches: "Wireless Mic for Speeches",
                        background_music_playlist: "Background Music Playlist",
                        up_to_3_hours_manned_playlist:
                          "Up to 3 hours Manned Playlist",
                        up_to_3_hours_band_member_dj:
                          "Up to 3 hours Band Member DJing with Mixing Console/Decks",
                        dj_live_sax_3x30mins:
                          "Add 3x30mins Sax Performance to Band Member DJing",
                        dj_live_bongos_3x30mins:
                          "Add 3x30mins Bongos Performance to Band Member DJing",
                        dj_live_bongos_and_sax_3x30mins:
                          "Add 3x30mins Sax & Bongos Performance to Band Member DJing",
                        extra_30min_performance_per_band_member:
                          "30mins Additional Performance",
                        extra_40min_performance_per_band_member:
                          "40mins Additional Performance",
                        extra_60min_performance_per_band_member:
                          "60mins Additional Performance",
                        israeli_dancing_20mins_per_band_member:
                          "20mins Israeli Performance",
                        late_stay_60min_per_band_member:
                          "60mins Late Stay (post midnight)",
                        early_arrival_60min_per_band_member:
                          "60mins Early Arrival",
                        extra_song_request_per_band_member:
                          "Extra Song Request",
                      };

                      // Immediately after definition of labelsMap, add normalizedLabelsMap
                      const normalizedLabelsMap = Object.fromEntries(
                        Object.entries(labelsMap).map(([key, label]) => [
                          normalizeKey(key),
                          label,
                        ])
                      );

                      // Normalize both map keys and input key for reliable matching
                      const normalizedKey = normalizeKey(key);
                      const label =
                        Object.entries(normalizedLabelsMap).find(([mapKey]) =>
                          normalizeKey(key).startsWith(mapKey)
                        )?.[1] || fallbackLabel;
                      // --- PATCH: grid-based layout for extras row ---
                      return (
                        <div
                          key={key}
                          className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b py-1 sm:gap-3"
                        >
                          {/* Label */}
                          <span className="whitespace-normal break-words">
                            {label}
                          </span>
                          {/* Price */}
                          <span className="font-semibold justify-self-end">
                            £{finalFee}
                          </span>

                          {/* Cart icon */}
                          <img
                            src={assets.add_to_cart_icon}
                            alt="Add to cart"
                            className="w-4 h-4 cursor-pointer justify-self-end"
                            onClick={() => {
                              if (!safeSelectedLineup || !actData?._id) return;
                              const lineupId =
                                safeSelectedLineup._id || safeSelectedLineup.lineupId;
                              const extra = {
                                name: label,
                                price: finalFee,
                                key,
                              };

                              addToCart(actData._id, lineupId, extra);
                              toast(
                                <CustomToast
                                  type="success"
                                  message={`Added ${label} to cart`}
                                />,
                                {
                                  position: "top-right",
                                  autoClose: 2000,
                                }
                              );
                            }}
                          />
                        </div>
                      );
                    })}

                  {!actData.extras && (
                    <p className="text-gray-400">No extras available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full sm:w-full mt-10">
          <div className="text-2xl mb-2">
            <Title
              text1={getPossessiveTitleCase(actData?.tscName)}
              text2="TECHNICAL SPECS"
            />
          </div>
          <div className="relative ">
            <Suspense fallback={null}>
  <VisibleOnScroll>
    <ActPerformanceOverviewLazy actData={actData} />
  </VisibleOnScroll>
</Suspense>
          </div>
        </div>

       <Suspense fallback={null}>
  <VisibleOnScroll>
    <RelatedActsLazy
      genres={actData.genre || []}
      instruments={actData.instruments || []}
      vocalist={actData.vocalist || ""}
      currentActId={actData._id}
    />
  </VisibleOnScroll>
</Suspense>
      </div>
    </div>
  );
};

export default Act;
