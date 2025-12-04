import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  useDeferredValue,
  useTransition,
} from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "./Title";
import ActItem from "./ActItem";

// Prefer matchMedia over resize listeners for fewer layout thrashes
const useMaxToShow = () => {
  const [maxToShow, setMaxToShow] = useState(10);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mqTablet = window.matchMedia(
      "(min-width: 640px) and (max-width: 1023.98px)"
    );
    const update = () => setMaxToShow(mqTablet.matches ? 8 : 10);
    update();
    mqTablet.addEventListener("change", update);
    return () => mqTablet.removeEventListener("change", update);
  }, []);
  return maxToShow;
};

// Idle scheduling shim so we don't block first paint
const scheduleIdle = (fn) => {
  if (typeof window !== "undefined" && window.requestIdleCallback) {
    return window.requestIdleCallback(fn, { timeout: 150 });
  }
  return setTimeout(fn, 0);
};

const NewActs = () => {
  const { acts, userId, shortlistAct, shortlistItems } = useContext(ShopContext);

  // Defer large arrays so typing/search/state updates don’t stall rendering
  const deferredActs = useDeferredValue(acts);
  const deferredShortlist = useDeferredValue(shortlistItems);

  // Stable shortlist membership lookup
  const shortlistSet = useMemo(
    () => new Set(Array.isArray(deferredShortlist) ? deferredShortlist : []),
    [deferredShortlist]
  );
  const isShortlisted = useCallback(
    (actId) => shortlistSet.has(actId),
    [shortlistSet]
  );
  const handleShortlistToggle = useCallback(
    (id) => shortlistAct(userId, id),
    [shortlistAct, userId]
  );

  const maxToShow = useMaxToShow();

  // Display list is kept as references to the original act objects (no cloning)
  const [newestActs, setNewestActs] = useState([]);

  // Cache raw computed prices by act id + version timestamp
  const priceCacheRef = useRef(new Map()); // key: actId, value: { value, version }
  const [priceMap, setPriceMap] = useState(() => new Map()); // key: actId, value: number|null

  // ————— Price helpers —————
  const calculatePrice = (act) => {
    if (!act?.lineups?.length) return null;
    const sorted = [...act.lineups].sort(
      (a, b) => (a.bandMembers?.length || 0) - (b.bandMembers?.length || 0)
    );
    const smallest = sorted[0];
    if (!smallest?.bandMembers) return null;

    // 1) Prefer lineup.base_fee if present (fast path)
    const baseFeeTotal = smallest?.base_fee?.total_fee;
    if (typeof baseFeeTotal === "number" && baseFeeTotal > 0) {
      // Apply your 20% margin (same rule you use elsewhere)
      return Math.ceil(baseFeeTotal * 1.2);
    }

    // 2) Fallback: derive from essential musician + additional roles
    const essentialFees = smallest.bandMembers.flatMap((m) => {
      const fees = [];
      if (m.isEssential && typeof m.fee === "number") fees.push(m.fee);
      m.additionalRoles?.forEach((r) => {
        if (r.isEssential && typeof r.additionalFee === "number")
          fees.push(r.additionalFee);
      });
      return fees;
    });
    const total = essentialFees.reduce((s, f) => s + f, 0);
    return total ? Math.ceil(total / 0.75) : null; // maintain your original margin rule
  };

  const calculatePriceCached = (act) => {
    const key = act?._id;
    if (!key) return null;
    const version = act?.updatedAt || act?.createdAt || "";
    const cache = priceCacheRef.current;
    const hit = cache.get(key);
    if (hit && hit.version === version) return hit.value;
    const value = calculatePrice(act);
    cache.set(key, { value, version });
    return value;
  };

  // ————— Data slice for this widget —————
  const newestSlice = useMemo(() => {
    const list = Array.isArray(deferredActs) ? deferredActs : [];
    const withLineups = list.filter(
      (act) => act && Array.isArray(act.lineups) && act.lineups.length > 0
    );

    // Sort newest-first (fallback to updatedAt if needed)
    withLineups.sort((a, b) => {
      const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return bTime - aTime;
    });

    return withLineups.slice(0, maxToShow);
  }, [deferredActs, maxToShow]);

  const [, startTransition] = useTransition();

  useEffect(() => {
    // Phase 1: fast paint with just the act references (no cloning, no price yet)
    setNewestActs(newestSlice);

    // Phase 2: compute prices off the main critical path
    const id = scheduleIdle(() => {
      startTransition(() => {
        setPriceMap((prev) => {
          const next = new Map(prev);
          for (const act of newestSlice) {
            const id = act?._id;
            if (!id) continue;
            if (!next.has(id)) {
              next.set(id, calculatePriceCached(act));
            }
          }
          return next;
        });
      });
    });

    return () => {
      if (typeof window !== "undefined") {
        if (window.cancelIdleCallback) window.cancelIdleCallback(id);
        else clearTimeout(id);
      }
    };
  }, [newestSlice]);

  return (
    <div className="my-10">
      <div className="text-center py-8 text-3xl">
        <Title text1="NEW" text2="ACTS" />
        <p className="w-3.4 m-auto text-xs sm:text-md md:text-base text-gray-600">
          Our most recent additions to The Supreme Collective, raring to make your event stellar.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
        {newestActs.map(
          (item) =>
            item?.lineups?.length > 0 && (
              <div
                key={item._id}
                style={{ contentVisibility: "auto", containIntrinsicSize: "320px 420px" }}
              >
                <ActItem
                  actData={item}
                  isShortlisted={isShortlisted(item._id)}
                  onShortlistToggle={() => handleShortlistToggle(item._id)}
                  price={priceMap.get(item._id) ?? null}
                />
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default NewActs;