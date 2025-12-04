import React, { useContext, useMemo, useState, useEffect, useDeferredValue } from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "./Title";
import ActItem from "./ActItem";

// Responsive item-count without listening to every resize pixel
function useMaxToShow() {
  const [max, setMax] = useState(5); // desktop default

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return;

    const mqPhone = window.matchMedia("(max-width: 639px)"); // <640
    const mqTablet = window.matchMedia("(min-width: 640px) and (max-width: 1023px)"); // 640–1023

    const compute = () => setMax(mqPhone.matches || mqTablet.matches ? 4 : 5);
    compute();

    const onChange = () => compute();
    mqPhone.addEventListener("change", onChange);
    mqTablet.addEventListener("change", onChange);

    return () => {
      mqPhone.removeEventListener("change", onChange);
      mqTablet.removeEventListener("change", onChange);
    };
  }, []);

  return max;
}

const BestSeller = () => {
  const { acts, userId, shortlistAct, isShortlisted } = useContext(ShopContext);

  // Defer heavy list ops if acts is being updated
  const deferredActs = useDeferredValue(acts);
  const maxToShow = useMaxToShow();

  // 1) Only approved acts
  const approvedActs = useMemo(() => {
    const list = Array.isArray(deferredActs) ? deferredActs : [];
    return list.filter(
      (a) => a?.status === "approved" || a?.status === "Approved, changes pending"
    );
  }, [deferredActs]);

  // 2) Choose best sellers (flagged first, fallback to popularity), memoized
  const bestSeller = useMemo(() => {
    if (!approvedActs.length) return [];

    const flagged = approvedActs.filter((a) => Boolean(a?.bestseller) || Boolean(a?.bestSeller));
    if (flagged.length) return flagged.slice(0, maxToShow);

    // Fallback: most popular by timesShortlisted, then newest
    return [...approvedActs]
      .sort((A, B) => {
        const tA = A?.timesShortlisted || 0;
        const tB = B?.timesShortlisted || 0;
        if (tB !== tA) return tB - tA;
        const dA = new Date(A?.createdAt || 0).getTime();
        const dB = new Date(B?.createdAt || 0).getTime();
        return dB - dA;
      })
      .slice(0, maxToShow);
  }, [approvedActs, maxToShow]);

  return (
    <div className="my-10">
      <div className="text-center text-3xl py-8">
        <Title text1="YOUR" text2="FAVES" />
        <p className="w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600">
          Make your life as easy as possible. Cut to the chase and book the
          cream of the crop.
        </p>
      </div>

      {bestSeller.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No featured acts yet.</p>
      ) : (
        // ✅ Responsive layout
        <div
          className="
            grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5
            gap-4 gap-y-6
            justify-center
          "
        >
          {bestSeller.map((item) => (
            <ActItem
              key={item._id}
              actData={item}
              isShortlisted={isShortlisted(item._id)}
              onShortlistToggle={() => shortlistAct(userId, item._id)}
              price={item.formattedPrice}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BestSeller;