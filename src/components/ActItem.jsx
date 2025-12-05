import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useDeferredValue,
  useRef,
} from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import CustomToast from './CustomToast';
import calculateActPricing from '../pages/utils/pricing';
import { ShopContext } from '../context/ShopContext';
import useOnScreen from '../hooks/useOnScreen';
import { priceCache, makePriceKey } from '../pages/utils/priceCache';
import useRenderTracker from '../hooks/useRenderTracker';

const DBG = true;
const log  = (...a) => DBG && console.log('🎸[ActItem]', ...a);
const warn = (...a) => DBG && console.warn('🎸[ActItem]', ...a);
const group = (label, fn) => { if (!DBG) return fn(); console.groupCollapsed(`🎸[ActItem] ${label}`); try { fn(); } finally { console.groupEnd(); } };

// Cloudinary support (for public_id → URL)
const CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
  import.meta.env.VITE_CLOUD_NAME ||
  '';

const buildFromPublicId = (publicId) => {
  if (!publicId || !CLOUD_NAME) return '';
  const pid = String(publicId).trim().replace(/^\/+/, '');
  // Produce a vanilla upload URL; `cld()` will add transforms later
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${pid}`;
};


export function resolveActCardImage(act: any) {
  const candidate =
    act?.coverImage?.[0]?.url ||
    act?.images?.[0]?.url ||
    act?.profileImage?.[0]?.url ||
    "";

  // If we truly have nothing, use placeholder
  if (!candidate) return "/placeholder.jpg";

  // If it's already an absolute URL, just use it (Cloudinary or not)
  if (/^https?:\/\//i.test(candidate)) return candidate;

  // If it's a public_id (no protocol), build a Cloudinary URL if cloud name exists
  const cloud =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
    import.meta.env.REACT_APP_CLOUDINARY_NAME; // fallback in case you still have this set
  if (cloud) {
    return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto/${candidate}`;
  }

  // Last resort: if it's a site-relative path, use it; else placeholder
  return candidate.startsWith("/") ? candidate : "/placeholder.jpg";
}

const imgSrc = useMemo(() => resolveActCardImage(act), [act]);

console.log("🎸[ActItem] 🖼️ image picked", {
  actId: act._id,
  picked: imgSrc,
  candidate:
    act?.coverImage?.[0]?.url ||
    act?.images?.[0]?.url ||
    act?.profileImage?.[0]?.url ||
    "",
  cloud:
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
    import.meta.env.REACT_APP_CLOUDINARY_NAME ||
    null,
});

// Extra debugging of the incoming image shapes
const debugImageShape = (act) => {
  if (!DBG) return;
  try {
    const peek = (x) => {
      if (Array.isArray(x)) {
        return x.slice(0, 3).map((it) =>
          typeof it === 'string'
            ? it
            : Object.fromEntries(
                Object.keys(it || {}).slice(0, 6).map((k) => [k, it[k]])
              )
        );
      }
      if (x && typeof x === 'object') {
        const keys = Object.keys(x);
        return Object.fromEntries(keys.slice(0, 8).map((k) => [k, x[k]]));
      }
      return x ?? null;
    };

    group('🧪 image-shape', () => {
      log('CLOUD_NAME present:', !!CLOUD_NAME);
      log('Top-level fields', {
        heroImage: act?.heroImage,
        coverImage: act?.coverImage,
        image: act?.image,
      });
      log('Arrays snapshot', {
        profileImage: peek(act?.profileImage),
        images: peek(act?.images),
        photos: peek(act?.photos),
        gallery: peek(act?.gallery),
      });
    });
  } catch (e) {
    console.error('🎸[ActItem] debugImageShape failed', e);
  }
};

/* ------------------------------- URL helpers ------------------------------ */

// Is this a Cloudinary public_id-like string?
const isPublicIdString = (s) => typeof s === 'string' && !!s.trim() && !s.startsWith('http') && !s.startsWith('/') && !s.includes(' ');

// Normalise a possibly-empty/relative value into a usable URL or "".
const valueToUrl = (v) => {
  if (!v) return '';

  // If an array sneaks in here, delegate properly
  if (Array.isArray(v)) return fromArray(v);

  // If it's already a string
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return '';
    if (s.startsWith('http')) return s; // already a URL
    // Treat as Cloudinary public_id if it looks like one
    if (isPublicIdString(s)) {
      const built = buildFromPublicId(s);
      return built || '';
    }
    return '';
  }

  // If it's an object (various shapes)
  if (typeof v === 'object') {
    const u = (v.url || v.secure_url || v.src || v.link || v.path || '').trim();
    if (u) {
      if (u.startsWith('http')) return u; // full URL
      if (isPublicIdString(u)) {
        const built = buildFromPublicId(u);
        if (built) return built;
      }
    }
    if (v.public_id) {
      const built = buildFromPublicId(String(v.public_id));
      if (built) return built;
    }
    return '';
  }

  return '';
};

// Try to pick the first usable URL from an array of strings/objects.
// Prefer items flagged with isPrimary/isHero/primary.
const fromArray = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const pref = arr.find(
    (it) =>
      !!(it && (it.isPrimary || it.isHero || it.primary))
  );
  const candidates = pref ? [pref, ...arr] : arr;
  for (const it of candidates) {
    const u = valueToUrl(it);
    if (u) return u;
  }
  return '';
};

// Resolve an act's best hero image across many shapes.
// Always returns a non-empty string by falling back to '/placeholder.jpg'.
const pickHeroImage = (act) => {
  // Common fields in your data across generations
  const cands = [
    // Explicit hero-ish fields first (string/object)
    valueToUrl(act?.heroImage),

    // Arrays first-class (schema shows arrays for coverImage/profileImage/images/photos/gallery)
    fromArray(act?.coverImage),
    fromArray(act?.profileImage),
    fromArray(act?.images),
    fromArray(act?.photos),
    fromArray(act?.gallery),

    // Single directly-stored string/object fallbacks
    valueToUrl(act?.image),
  ];

  let chosen = cands.find(Boolean) || '';
  // If Cloudinary public_id leaked in by mistake (no protocol), keep as-is;
  // cld() will leave it if it can't transform.
  if (!chosen) chosen = '/placeholder.jpg';

  return chosen;
};

// Cloudinary transformer. If it isn't a Cloudinary URL, return as-is.
// Also guard against empty values so <img src> is never "".
const cld = (url, { w = 1200, crop = 'limit' } = {}) => {
  const src = url || '/placeholder.jpg';
  if (typeof src !== 'string') return '/placeholder.jpg';
  if (!src.includes('/upload/')) return src; // non-cloudinary (or public_id only)
  return src.replace(
    '/upload/',
    `/upload/f_auto,q_auto,dpr_auto,c_${crop},w_${w}/`
  );
};

/* -------------------------------- Component ------------------------------- */

const ActItem = ({ actData, shortlistCount, lite = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const cardRef = useRef(null);
  const isOnScreen = useOnScreen(cardRef);
  const [isAnimating, setIsAnimating] = useState(false);

  // --- loves
  const initialLove =
    Number(
      actData?.timesShortlisted ??
      shortlistCount ??
      actData?.shortlistCount ??
      actData?.metrics?.shortlists ??
      0
    ) || 0;
  const [loveCount, setLoveCount] = useState(() => initialLove);

  // --- price
  const [price, setPrice] = useState(null);

  // Mount / unmount
  useEffect(() => {
    group('mount', () => {
      log('mount', {
        actId: actData?._id,
        name: actData?.tscName || actData?.name,
        lite,
        hasLineups: !!actData?.lineups?.length,
        initialLove,
      });
      debugImageShape(actData);
      if (!CLOUD_NAME) {
        warn('⚠️ No Cloudinary cloud name found (VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUD_NAME). If image fields contain public_id strings, thumbnails will fall back to placeholder.');
      }
    });
    return () => log('unmount', { actId: actData?._id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    log('👀 onScreen changed →', isOnScreen, { actId: actData?._id });
  }, [isOnScreen, actData?._id]);

  useRenderTracker('ActItem', {
    actId: actData?._id,
    name: actData?.tscName,
    hasLineups: !!actData?.lineups?.length,
    shortlisted: !!shortlistCount,
    onScreen: isOnScreen,
  });

  // Context
  const {
    shortlistedActs,
    shortlistAct,
    userId,
    selectedCounty,
    selectedAddress,
    selectedDate,
    isShortlisted: isShortlistedCtx,
  } = useContext(ShopContext);

  // Defer fast-changing state for the pricing effect
  const defAddr = useDeferredValue(selectedAddress);
  const defDate = useDeferredValue(selectedDate);

  useEffect(() => {
    log('🔁 context changed', {
      userId,
      selectedCounty,
      selectedAddress,
      selectedDate,
      defAddr,
      defDate,
    });
  }, [userId, selectedCounty, selectedAddress, selectedDate, defAddr, defDate]);

  // --- county fees length
  const countyFeesLen = useMemo(() => (
    actData?.useCountyTravelFee && actData?.countyFees
      ? Object.keys(actData.countyFees).length
      : 0
  ), [actData?.useCountyTravelFee, actData?.countyFees]);

  // --- base price memo
  const basePrice = useMemo(() => {
    const lineup = actData?.lineups?.[0] || null;
    const base = actData?.formattedPrice?.total ?? lineup?.base_fee?.[0]?.total_fee ?? null;
    const numeric = base != null ? Number(String(base).replace(/[^0-9.+-]/g, '')) : null;
    log('💷 basePrice memo', { actId: actData?._id, base: numeric });
    return numeric;
  }, [actData]);

  const setPriceIfChanged = useCallback((next) => {
    setPrice((prev) => {
      if (!prev) {
        log('💰 price set (initial)', next);
        return next;
      }
      const same =
        prev.total === next.total &&
        !!prev.travelCalculated === !!next.travelCalculated &&
        (prev.travelFeeTotal ?? 0) === (next.travelFeeTotal ?? 0);
      if (same) return prev;
      log('💰 price updated', { from: prev, to: next });
      return next;
    });
  }, []);

  // --- keep loveCount in sync
  useEffect(() => {
    if (lite) return;
    const next =
      Number(
        actData?.timesShortlisted ??
        shortlistCount ??
        actData?.shortlistCount ??
        actData?.metrics?.shortlists ??
        0
      ) || 0;

    setLoveCount((prev) => (prev === next ? prev : next));
  }, [
    lite,
    actData?.timesShortlisted,
    shortlistCount,
    actData?.shortlistCount,
    actData?.metrics?.shortlists
  ]);

  // --- pricing effect
  useEffect(() => {
    if (lite) {
      log('⏭️ lite mode: skip pricing');
      setPrice(null);
      return;
    }
    if (!actData?.lineups?.length) {
      log('⏭️ no lineups: using base price', { basePrice });
      if (basePrice != null) setPrice({ total: basePrice, travelCalculated: false });
      return;
    }

    const hasAnyLocation = !!(defAddr || selectedCounty);
    if (!defDate || !hasAnyLocation) {
      log('⏭️ missing date or location: using base price', {
        defDate, defAddr, selectedCounty, basePrice
      });
      if (basePrice != null) setPrice({ total: basePrice, travelCalculated: false });
      return;
    }

    if (!isOnScreen) {
      log('⏸️ not on-screen → skip pricing this frame');
      return;
    }

    const lineup = actData.lineups[0];
    const hasCountyTable = actData.useCountyTravelFee && countyFeesLen > 0;

    const key = makePriceKey({
      actId: actData._id,
      lineupId: lineup?._id || lineup?.lineupId,
      dateISO: defDate,
      address: defAddr || '',
      county: hasCountyTable ? selectedCounty : '',
    });

    const cached = priceCache.get(key);
    if (cached) {
      log('📦 cache hit', { key, cached });
      setPrice(cached);
      return;
    }
    log('🧮 cache miss → calculating', {
      key,
      actId: actData?._id,
      hasCountyTable,
      countyFeesLen,
      selectedCounty,
      defAddr,
      defDate
    });

    let idleId = null;
    let timeoutId = null;

    const run = async () => {
      try {
        const result = await calculateActPricing(
          actData,
          hasCountyTable ? selectedCounty : null,
          defAddr,
          defDate,
          lineup
        );

        const final = result && result.total != null
          ? result
          : (basePrice != null ? { total: basePrice, travelCalculated: false } : null);

        if (final) {
          priceCache.set(key, final);
          log('✅ pricing done', { key, final });
          setPriceIfChanged(final);
        } else {
          warn('⚠️ pricing returned no result and no base price available', { key });
        }
      } catch (err) {
        console.error('❌ Failed to calculate price:', {
          err,
          actId: actData?._id,
          useCountyTravelFee: actData?.useCountyTravelFee,
        });
        if (basePrice != null) setPrice({ total: basePrice, travelCalculated: false });
      }
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(run, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(run, 50);
    }

    return () => {
      if (idleId && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
      log('🧽 cleanup pricing scheduler', { key });
    };
  }, [
    actData?._id,
    actData?.lineups?.length,
    actData?.useCountyTravelFee,
    countyFeesLen,
    selectedCounty,
    defAddr,
    defDate,
    isOnScreen,
    basePrice,
    lite,
    setPriceIfChanged,
  ]);

  // --- display price
  const rawTotal = (actData?.formattedPrice?.total ?? price?.total);
  const displayTotal =
    rawTotal != null ? Number(String(rawTotal).replace(/[^0-9.+-]/g, '')) : null;

  useEffect(() => {
    log('🏷️ displayTotal changed →', displayTotal, {
      actId: actData?._id,
      travelCalculated: price?.travelCalculated ?? null,
    });
  }, [displayTotal, price?.travelCalculated, actData?._id]);

  // --- image resolution (robust + guaranteed fallback)
  const pickedUrl = useMemo(() => pickHeroImage(actData), [actData]);
  const resolvedUrl = useMemo(() => cld(pickedUrl, { w: 1200, crop: 'limit' }), [pickedUrl]);
  const [imgSrc, setImgSrc] = useState(resolvedUrl);

  useEffect(() => {
    setImgSrc(resolvedUrl);
    DBG && log('🖼️ image picked', {
      actId: actData?._id,
      name: actData?.tscName || actData?.name,
      picked: pickedUrl || '(placeholder)',
      resolved: resolvedUrl || '(placeholder)',
      cloudNamePresent: !!CLOUD_NAME,
      imagesLen: Array.isArray(actData?.images) ? actData.images.length : 0,
      profileLen: Array.isArray(actData?.profileImage) ? actData.profileImage.length : 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedUrl]);

  const handleHeartClick = async (e) => {
    if (lite) return;
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      const fromActsListing = String(location.pathname || '').startsWith('/acts');
      const listUrl =
        `${location.pathname || ''}${location.search || ''}${location.hash || ''}` || '/acts';
      const actUrl = actData?._id ? `/act/${actData._id}` : '/';
      const fallback = fromActsListing ? listUrl : actUrl;
      log('🔐 redirecting to login (shortlist requires auth)', { fallback });
      sessionStorage.setItem('postLoginNext', fallback);
      navigate('/login', { state: { from: fallback } });
      return;
    }

    setIsAnimating(true);

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
        headers: { "Content-Type": "application/json" },
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
      log('✅ availability request sent');
    } catch (err) {
      console.error("❌ Failed to POST /api/availability/request:", err);
    }
    setTimeout(() => setIsAnimating(false), 300);
  };

  const formatLoveCount = (count) => (count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K` : count);
  const scrollTop = useCallback(() => window.scrollTo(0, 0), []);

  const isShortlisted = (isShortlistedCtx && actData?._id)
    ? !!isShortlistedCtx(actData._id)
    : !!(shortlistedActs?.includes(String(actData?._id)));

  return (
    <div ref={cardRef} className="relative group">
      <Link
        to={`/act/${actData?._id}`}
        onClick={scrollTop}
        className="block text-gray-700"
      >
        <div className="overflow-hidden h-full w-full">
          <img
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="h-full w-full object-cover hover:scale-110 transition ease-in-out"
            style={{ aspectRatio: '4 / 3' }} // helps layout shift; remove if not desired
            src={imgSrc || '/placeholder.jpg'}
            alt={actData?.tscName || actData?.name || 'Act'}
            onError={() => {
              if (imgSrc !== '/placeholder.jpg') {
                warn('🖼️ image error → falling back to placeholder', {
                  actId: actData?._id,
                  badSrc: imgSrc,
                });
                setImgSrc('/placeholder.jpg');
              }
            }}
          />
        </div>

        <div className="flex justify-between items-center pt-3 pb-1">
          <div className="min-h-[40px] flex flex-col justify-center">
            <p className="text-sm">{actData?.tscName || actData?.name}</p>
            {!lite && (
              <div className="act-price">
                {displayTotal !== null
                  ? (price?.travelCalculated ? `£${displayTotal}` : `from £${displayTotal}`)
                  : 'Loading price...'}
              </div>
            )}
          </div>

          {!lite && (
            <div className="flex flex-col items-center lg:items-end justify-between min-h-[40px]">
              <button
                onClick={handleHeartClick}
                disabled={isAnimating}
                className="p-1 transition-transform duration-150 ease-in-out"
                aria-label={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
              >
                {isShortlisted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 34 32"
                       className={`w-6 h-6 transition-transform ${isAnimating ? 'scale-125' : ''}`}
                       fill="#ff6667" stroke="#cc5253" strokeWidth="1.5">
                    <path d="M23.6,0c-3.4,0-6.4,2.2-7.6,5.4C14.8,2.2,11.8,0,8.4,0C3.8,0,0,3.9,0,8.7c0,4.5,3.2,7.7,8,12.2
                      c3.4,3.2,6.5,5.8,7.3,6.4c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3c0.8-0.6,3.9-3.2,7.3-6.4c4.8-4.5,8-7.7,8-12.2
                      C32,3.9,28.2,0,23.6,0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 34 32"
                       className={`w-6 h-6 transition-transform ${isAnimating ? 'scale-125' : ''}`}
                       fill="none" stroke="#000" strokeWidth="1.5">
                    <path d="M23.6,0c-3.4,0-6.4,2.2-7.6,5.4C14.8,2.2,11.8,0,8.4,0C3.8,0,0,3.9,0,8.7c0,4.5,3.2,7.7,8,12.2
                      c3.4,3.2,6.5,5.8,7.3,6.4c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3c0.8-0.6,3.9-3.2,7.3-6.4c4.8-4.5,8-7.7,8-12.2
                      C32,3.9,28.2,0,23.6,0z" />
                  </svg>
                )}
              </button>

              <p className={`text-xs ${loveCount === 0 ? 'text-gray-400' : 'text-gray-700'} text-center w-full self-center lg:self-end`}>
                {loveCount === 0 ? 'love me' : `${formatLoveCount(loveCount)} ${loveCount === 1 ? 'love' : 'loves'}`}
              </p>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

/* ----------------------------- Memoised compare ---------------------------- */

function areEqualActItem(prev, next) {
  const p = prev.actData || {};
  const n = next.actData || {};

  const sameId = String(p._id) === String(n._id);
  const sameName = (p.tscName || p.name) === (n.tscName || n.name);

  // Compare resolved hero URLs rather than the raw arrays/objects
  const heroP = pickHeroImage(p);
  const heroN = pickHeroImage(n);
  const sameImg = heroP === heroN;

  const sameLineupCount = (p.lineups?.length || 0) === (n.lineups?.length || 0);
  const sameTimesShortlisted = (p.timesShortlisted ?? 0) === (n.timesShortlisted ?? 0);
  const sameFormattedPrice = (p.formattedPrice?.total ?? null) === (n.formattedPrice?.total ?? null);
  const sameShortlistCount = (prev.shortlistCount ?? 0) === (next.shortlistCount ?? 0);
  const sameLite = (prev.lite === next.lite);

  const equal =
    sameId &&
    sameName &&
    sameImg &&
    sameLineupCount &&
    sameTimesShortlisted &&
    sameFormattedPrice &&
    sameShortlistCount &&
    sameLite;

  if (DBG && !equal) {
    const diffs = [];
    if (!sameId) diffs.push('id');
    if (!sameName) diffs.push('name');
    if (!sameImg) diffs.push('image');
    if (!sameLineupCount) diffs.push('lineupCount');
    if (!sameTimesShortlisted) diffs.push('timesShortlisted');
    if (!sameFormattedPrice) diffs.push('formattedPrice.total');
    if (!sameShortlistCount) diffs.push('prop.shortlistCount');
    if (!sameLite) diffs.push('prop.lite');
    console.log('🟥[ActItem.memo] unequal → re-render', {
      idPrev: p._id, idNext: n._id, diffs
    });
  }
  return equal;
}

export default React.memo(ActItem, areEqualActItem);