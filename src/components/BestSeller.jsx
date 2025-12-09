import React, { useContext, useMemo, useDeferredValue } from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "./Title";
import ActItem from "./ActItem";

function useMaxToShow() {
  const [max, setMax] = React.useState(5);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mqPhone = window.matchMedia("(max-width: 639px)");
    const mqTablet = window.matchMedia("(min-width: 640px) and (max-width: 1023px)");
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
  // ✅ Use lightweight cards, same as NewActs
  const { actCards } = useContext(ShopContext);
  const deferredCards = useDeferredValue(actCards);
  const maxToShow = useMaxToShow();

  const bestSeller = useMemo(() => {
    const list = Array.isArray(deferredCards) ? deferredCards : [];
    if (!list.length) return [];

    // Prefer explicit bestseller flag if available; otherwise fall back to loveCount
    const flagged = list.filter((a) => Boolean(a?.bestseller) || Boolean(a?.bestSeller));
    if (flagged.length) return flagged.slice(0, maxToShow);

    return [...list]
      .sort((A, B) => {
        const lA = A?.loveCount || 0;
        const lB = B?.loveCount || 0;
        return lB - lA; // desc by loveCount
      })
      .slice(0, maxToShow);
  }, [deferredCards, maxToShow]);

  return (
    <div className="my-10">
      <div className="text-center text-3xl py-8">
        <Title text1="YOUR" text2="FAVES" />
        <p className="w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600">
          Make your life as easy as possible. Cut to the chase and book the cream of the crop.
        </p>
      </div>

      {bestSeller.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No featured acts yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
          {bestSeller.map((item) => (
            <div
              key={String(item.actId || item._id)}
              style={{ contentVisibility: "auto", containIntrinsicSize: "320px 420px" }}
            >
              <ActItem actData={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BestSeller;