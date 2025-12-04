import React, { useContext, useEffect, useMemo, useState, useRef, useCallback, useDeferredValue, useTransition } from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "./Title";
import ActItem from "./ActItem";

// Prefer matchMedia over resize listeners for fewer layout thrashes
const useMaxToShow = () => {
  const [maxToShow, setMaxToShow] = useState(10);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mqTablet = window.matchMedia("(min-width: 640px) and (max-width: 1023.98px)");
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

  const deferredActs = useDeferredValue(acts);
  const deferredShortlist = useDeferredValue(shortlistItems);

  const shortlistSet = useMemo(() => new Set(Array.isArray(deferredShortlist) ? deferredShortlist : []), [deferredShortlist]);

  const isShortlisted = useCallback((actId) => shortlistSet.has(actId), [shortlistSet]);

  const handleShortlistToggle = useCallback((id) => {
    return shortlistAct(userId, id);
  }, [shortlistAct, userId]);

  const maxToShow = useMaxToShow();

  const [newestActs, setNewestActs] = useState([]);

  const priceCacheRef = useRef(new Map()); // key: actId, value: { value, version }

  const calculatePrice = (act) => {
    if (!act?.lineups?.length) return null;
    const sorted = [...act.lineups].sort(
      (a, b) => (a.bandMembers?.length || 0) - (b.bandMembers?.length || 0)
    );
    const smallest = sorted[0];
    if (!smallest?.bandMembers) return null;
    const essentialFees = smallest.bandMembers.flatMap((m) => {
      const fees = [];
      if (m.isEssential && typeof m.fee === "number") fees.push(m.fee);
      m.additionalRoles?.forEach((r) => {
        if (r.isEssential && typeof r.additionalFee === "number") fees.push(r.additionalFee);
      });
      return fees;
    });
    const total = essentialFees.reduce((s, f) => s + f, 0);
    return total ? Math.ceil(total / 0.75) : null;
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

  const newestApprovedSlice = useMemo(() => {
    const list = Array.isArray(deferredActs) ? deferredActs : [];
    const approved = list.filter(
      (act) => act && (act.status === "approved" || act.status === "Approved, changes pending")
    );
    approved.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return approved.slice(0, maxToShow);
  }, [deferredActs, maxToShow]);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Phase 1: fast paint without price
    setNewestActs(newestApprovedSlice);

    // Phase 2: compute prices off the main critical path
    const id = scheduleIdle(() => {
      startTransition(() => {
        setNewestActs((prev) =>
          prev.map((act) => ({
            ...act,
            formattedPrice: calculatePriceCached(act),
          }))
        );
      });
    });

    return () => {
      if (typeof window !== "undefined") {
        if (window.cancelIdleCallback) window.cancelIdleCallback(id);
        else clearTimeout(id);
      }
    };
  }, [newestApprovedSlice]);

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
              <ActItem
                key={item._id}
                actData={item}
                isShortlisted={isShortlisted(item._id)}
                onShortlistToggle={() => handleShortlistToggle(item._id)}
                price={item.formattedPrice}
              />
            )
        )}
      </div>
    </div>
  );
};

export default NewActs;