// src/components/RelatedActs.jsx
import React, { useContext, useMemo, useDeferredValue } from "react";
import Title from "./Title";
import { ShopContext } from "../context/ShopContext";
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

const RelatedActs = ({ genres = [], instruments = [], vocalist = "", currentActId }) => {
  const { actCards } = useContext(ShopContext);
  const deferredCards = useDeferredValue(actCards);
  const maxToShow = useMaxToShow();

  const related = useMemo(() => {
    const list = Array.isArray(deferredCards) ? deferredCards : [];
    if (!list.length) return [];

    const norm = (arr) =>
      Array.isArray(arr) ? arr.map((x) => String(x).toLowerCase()) : [];

    const gWant = norm(genres);
    const iWant = norm(instruments);
    const vWant = String(vocalist || "").toLowerCase();

    const score = (a) => {
      const gHave = norm(a?.genre);
      const iHave = norm(a?.instruments);
      const vHave = String(a?.vocalist || "").toLowerCase();

      const genreMatches = gWant.length
        ? gHave.filter((g) => gWant.includes(g)).length
        : 0;

      const instrumentMatch = iWant.length && iHave.some((i) => iWant.includes(i)) ? 1 : 0;
      const vocalistMatch = vWant && vHave === vWant ? 1 : 0;

      return genreMatches * 10 + vocalistMatch * 3 + instrumentMatch * 1;
    };

    const isVisibleStatus = (s) => {
      const v = String(s || "").toLowerCase();
      // ✅ loosen this so you don’t accidentally filter everything out
      return v === "approved" || v === "live" || v === "active" || v === "published";
    };

    return [...list]
      .filter((a) => String(a?.actId || a?._id) !== String(currentActId))
      .filter((a) => !a?.status || isVisibleStatus(a.status))
      .map((a) => ({ ...a, _score: score(a) }))
      .filter((a) => a._score > 0) // only show genuine matches
      .sort((A, B) => B._score - A._score)
      .slice(0, maxToShow);
  }, [deferredCards, genres, instruments, vocalist, currentActId, maxToShow]);

  return (
    <div className="my-10">
      <div className="text-center text-3xl py-8">
        <Title text1="SIMILAR" text2="ACTS" />
      </div>

      {related.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No similar acts found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
          {related.map((item) => (
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

export default RelatedActs;