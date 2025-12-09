// frontend/src/components/BestSeller.jsx
import React, { useEffect, useMemo, useState } from "react";
import Title from "./Title";
import ActItem from "./ActItem";

const DBG = true;
const log = (...a) => DBG && console.log("⭐[BestSeller]", ...a);

function useMaxToShow() {
  const [max, setMax] = useState(5);
  useEffect(() => {
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

const BestSeller = ({ cards = [], loading = false }) => {
  const maxToShow = useMaxToShow();

  useEffect(() => {
    log("props:", { loading, len: Array.isArray(cards) ? cards.length : 0 });
  }, [cards, loading]);

  const bestSeller = useMemo(() => {
    const list = Array.isArray(cards) ? cards : [];
    if (!list.length) return [];

    const flagged = list.filter((a) => Boolean(a?.bestseller) || Boolean(a?.bestSeller));
    const result = (flagged.length ? flagged : [...list].sort((A, B) => (B?.loveCount || 0) - (A?.loveCount || 0)))
      .slice(0, maxToShow);

    log("computed bestSeller len:", result.length);
    if (result[0]) log("sample:", { actId: result[0].actId, name: result[0].name, love: result[0].loveCount });
    return result;
  }, [cards, maxToShow]);

  return (
    <div className="my-10">
      <div className="text-center text-3xl py-8">
        <Title text1="YOUR" text2="FAVES" />
        <p className="w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600">
          Make your life as easy as possible. Cut to the chase and book the cream of the crop.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-500">Loading…</p>
      ) : bestSeller.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No featured acts yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
          {bestSeller.map((item, i) => (
            <div
              key={String(item.actId || item._id || i)}
              style={{ contentVisibility: "auto", containIntrinsicSize: "320px 420px" }}
            >
              <ActItem actData={item} standalone sourceTag="BestSeller" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BestSeller;