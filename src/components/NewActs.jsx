// frontend/src/components/NewActs.jsx
import React, { useEffect, useMemo, useState } from "react";
import Title from "./Title";
import ActItem from "./ActItem";

const DBG = true;
const log = (...a) => DBG && console.log("🆕[NewActs]", ...a);

function useMaxToShow() {
  const [maxToShow, setMaxToShow] = useState(10);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mqTablet = window.matchMedia("(min-width:640px) and (max-width:1023.98px)");
    const update = () => setMaxToShow(mqTablet.matches ? 8 : 10);
    update();
    mqTablet.addEventListener("change", update);
    return () => mqTablet.removeEventListener("change", update);
  }, []);
  return maxToShow;
}

const NewActs = ({ cards = [], loading = false }) => {
  const maxToShow = useMaxToShow();

  useEffect(() => {
    log("props:", { loading, len: Array.isArray(cards) ? cards.length : 0 });
    if (cards?.[0]) log("sample:", { actId: cards[0].actId, name: cards[0].name, basePrice: cards[0].basePrice });
  }, [cards, loading]);

  const newestSlice = useMemo(() => {
    const list = Array.isArray(cards) ? cards : [];
    const sliced = list.slice(0, maxToShow);
    log("slice len:", sliced.length);
    return sliced;
  }, [cards, maxToShow]);

  return (
    <div className="my-10">
      <div className="text-center py-8 text-3xl">
        <Title text1="NEW" text2="ACTS" />
        <p className="w-3.4 m-auto text-xs sm:text-md md:text-base text-gray-600">
          Our most recent additions to The Supreme Collective, raring to make your event stellar.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-500">Loading…</p>
      ) : newestSlice.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No new acts found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
          {newestSlice.map((item, i) => (
            <div
              key={String(item.actId || item._id || i)}
              style={{ contentVisibility: "auto", containIntrinsicSize: "320px 420px" }}
            >
              <ActItem actData={item} standalone sourceTag="NewActs" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewActs;