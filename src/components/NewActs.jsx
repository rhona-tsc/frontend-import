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

const DBG = true;
const log = (...args) => DBG && console.log("🆕[NewActs]", ...args);
const group = (label, fn) => {
  if (!DBG) return fn();
  console.groupCollapsed(`🆕[NewActs] ${label}`);
  try { fn(); } finally { console.groupEnd(); }
};

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

  useEffect(() => {
    group("Context snapshot", () => {
      log("userId:", userId);
      log("acts len:", Array.isArray(acts) ? acts.length : acts);
      log("shortlistItems len:", Array.isArray(shortlistItems) ? shortlistItems.length : shortlistItems);
    });
  }, [acts, shortlistItems, userId]);

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
    (id) => {
      log("shortlist toggle ->", id);
      shortlistAct(userId, id);
    },
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
    log("price cached", { actId: key, version, value });
    return value;
  };

  // ————— Data slice for this widget —————
  const newestSlice = useMemo(() => {
    const list = Array.isArray(deferredActs) ? deferredActs : [];
    const withLineups = list.filter(
      (act) => act && Array.isArray(act.lineups) && act.lineups.length > 0
    );

    group("Compute newestSlice", () => {
      log("incoming acts len:", list.length);
      log("with lineups len:", withLineups.length);
    });

    // Sort newest-first (fallback to updatedAt if needed)
    withLineups.sort((a, b) => {
      const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return bTime - aTime;
    });

    const sliced = withLineups.slice(0, maxToShow);
    log("maxToShow:", maxToShow, "→ slice len:", sliced.length);
    return sliced;
  }, [deferredActs, maxToShow]);

  const [, startTransition] = useTransition();

  useEffect(() => {
    // Phase 1: fast paint with just the act references (no cloning, no price yet)
    setNewestActs(newestSlice);
    group("Phase 1 setNewestActs", () => {
      log("ids:", newestSlice.map(a => a?._id));
      log("names:", newestSlice.map(a => a?.tscName || a?.name));
    });

    // Phase 2: compute prices off the main critical path
    const id = scheduleIdle(() => {
      startTransition(() => {
        setPriceMap((prev) => {
          const next = new Map(prev);
          for (const act of newestSlice) {
            const aid = act?._id;
            if (!aid) continue;
            if (!next.has(aid)) {
              const price = calculatePriceCached(act);
              next.set(aid, price);
              log("price computed", { actId: aid, price });
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

  useEffect(() => {
    group("priceMap updated", () => {
      const arr = Array.from(priceMap.entries()).map(([id, price]) => ({ id, price }));
      log(arr);
    });
  }, [priceMap]);

  useEffect(() => {
    log("newestActs changed:", newestActs.length);
  }, [newestActs]);

  return (
    <div className="my-10">
      <div className="text-center py-8 text-3xl">
        <Title text1="NEW" text2="ACTS" />
        <p className="w-3.4 m-auto text-xs sm:text-md md:text-base text-gray-600">
          Our most recent additions to The Supreme Collective, raring to make your event stellar.
        </p>
      </div>

      {DBG && (
        <pre className="text-xs text-gray-500 p-2 overflow-auto">
          {JSON.stringify(
            {
              newestActsLen: newestActs.length,
              renderPriceCount: Array.from(priceMap.keys()).length,
              maxToShow,
            },
            null,
            2
          )}
        </pre>
      )}

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