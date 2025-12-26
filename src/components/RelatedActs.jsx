// src/components/RelatedActs.jsx
import React, { useContext, useMemo, useDeferredValue, useEffect, useRef } from "react";
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

  // 🔎 DEBUG (toggle off when done)
  const DEBUG_RELATED_ACTS = true;
  const lastDebugSigRef = useRef("");

  const related = useMemo(() => {
    const list = Array.isArray(deferredCards) ? deferredCards : [];

    const toList = (val) => {
      if (val == null) return [];
      // Arrays of strings/objects
      if (Array.isArray(val)) {
        return val
          .flatMap((x) => {
            if (x == null) return [];
            if (typeof x === "string") return [x];
            if (typeof x === "number" || typeof x === "boolean") return [String(x)];
            if (typeof x === "object") {
              // common shapes: { label }, { name }, { value }
              if (x.label) return [String(x.label)];
              if (x.name) return [String(x.name)];
              if (x.value) return [String(x.value)];
            }
            return [String(x)];
          })
          .map((s) => String(s));
      }

      // Single string: may be comma-separated
      if (typeof val === "string") {
        return val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      // Single object
      if (typeof val === "object") {
        if (val.label) return [String(val.label)];
        if (val.name) return [String(val.name)];
        if (val.value) return [String(val.value)];
        return [String(val)];
      }

      // number/boolean/etc
      return [String(val)];
    };

    const norm = (val) =>
      toList(val)
        .map((x) => String(x).toLowerCase().trim())
        .filter(Boolean);

    const gWant = norm(genres);
    const iWant = norm(instruments);
    const vWant = String(vocalist || "").toLowerCase().trim();

    const score = (a) => {
      const gHave = norm(a?.genres ?? a?.genre);
      const iHave = norm(a?.instruments ?? a?.instrument);
      const vHave = String(a?.vocalist || a?.leadVocalist || "").toLowerCase().trim();

      const genreMatches = gWant.length ? gHave.filter((g) => gWant.includes(g)).length : 0;
      const instrumentMatch = iWant.length && iHave.some((i) => iWant.includes(i)) ? 1 : 0;
      const vocalistMatch = vWant && vHave === vWant ? 1 : 0;

      return genreMatches * 10 + vocalistMatch * 3 + instrumentMatch * 1;
    };

    const isVisibleStatus = (s) => {
      const v = String(s || "").toLowerCase().trim();
      // allow common variants like "approved, changes pending"
      return (
        v.includes("approved") ||
        v.includes("live") ||
        v.includes("active") ||
        v.includes("published")
      );
    };

    // If no cards, return early (but still allow logging via effect below)
    if (!list.length) return [];

    // --- Pipeline with counts for debugging ---
    const afterId = list.filter((a) => String(a?.actId || a?._id) !== String(currentActId));
    const afterStatus = afterId.filter((a) => !a?.status || isVisibleStatus(a.status));
    const scored = afterStatus.map((a) => ({ ...a, _score: score(a) }));
    const positive = scored.filter((a) => a._score > 0);
    const final = [...positive].sort((A, B) => B._score - A._score).slice(0, maxToShow);

    // Stash debug info on the array itself (read in useEffect)
    final.__debug = {
      listCount: list.length,
      afterIdCount: afterId.length,
      afterStatusCount: afterStatus.length,
      scoredCount: scored.length,
      positiveCount: positive.length,
      finalCount: final.length,
      wants: { gWant, iWant, vWant },
      sampleCardKeys: list[0] ? Object.keys(list[0]) : [],
      top5Scored: scored
        .slice()
        .sort((A, B) => (B._score || 0) - (A._score || 0))
        .slice(0, 5)
        .map((a) => ({
          id: String(a?.actId || a?._id),
          name: a?.name || a?.tscName || a?.title,
          status: a?.status,
          genres: a?.genres ?? a?.genre,
          instruments: a?.instruments ?? a?.instrument,
          vocalist: a?.vocalist ?? a?.leadVocalist,
          _score: a?._score,
        })),
    };

    return final;
  }, [deferredCards, genres, instruments, vocalist, currentActId, maxToShow]);

  useEffect(() => {
    if (!DEBUG_RELATED_ACTS) return;

    const list = Array.isArray(deferredCards) ? deferredCards : [];
    const dbg = related && related.__debug ? related.__debug : null;

    // Build a signature to avoid spamming the console with identical logs
    const sigObj = {
      actCardsType: Array.isArray(actCards) ? "array" : typeof actCards,
      actCardsLen: Array.isArray(actCards) ? actCards.length : 0,
      deferredLen: list.length,
      currentActId: String(currentActId || ""),
      genres,
      instruments,
      vocalist,
      maxToShow,
      counts: dbg
        ? {
            listCount: dbg.listCount,
            afterIdCount: dbg.afterIdCount,
            afterStatusCount: dbg.afterStatusCount,
            positiveCount: dbg.positiveCount,
            finalCount: dbg.finalCount,
          }
        : null,
    };

    let sig = "";
    try {
      sig = JSON.stringify(sigObj);
    } catch {
      sig = String(Date.now());
    }

    if (sig === lastDebugSigRef.current) return;
lastDebugSigRef.current = sig;

    console.groupCollapsed(
      `[RelatedActs] cards=${sigObj.deferredLen} related=${Array.isArray(related) ? related.length : 0}`
    );
    console.log("props:", { genres, instruments, vocalist, currentActId, maxToShow });
    console.log("actCards:", {
      type: sigObj.actCardsType,
      len: sigObj.actCardsLen,
      deferredLen: sigObj.deferredLen,
    });

    if (!list.length) {
      console.warn("No actCards yet (deferredCards is empty). RelatedActs will be empty until cards load.");
      console.groupEnd();
      return;
    }

    console.log("first card keys:", dbg?.sampleCardKeys || (list[0] ? Object.keys(list[0]) : []));
    console.log("wants:", dbg?.wants || null);
    console.log("pipeline counts:", dbg ? {
      listCount: dbg.listCount,
      afterIdCount: dbg.afterIdCount,
      afterStatusCount: dbg.afterStatusCount,
      scoredCount: dbg.scoredCount,
      positiveCount: dbg.positiveCount,
      finalCount: dbg.finalCount,
    } : null);

    console.table(dbg?.top5Scored || []);
    console.groupEnd();
  }, [DEBUG_RELATED_ACTS, actCards, deferredCards, related, genres, instruments, vocalist, currentActId, maxToShow]);

  return (
    <div className="my-10">
      <div className="text-center text-3xl py-8">
        <Title text1="SIMILAR" text2="ACTS" />
      </div>

      {related.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No similar acts found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
          {(Array.isArray(related) ? related : []).map((item) => (
            <div
              key={String(item.actId || item._id)}
              style={{ contentVisibility: "auto", containIntrinsicSize: "320px 420px" }}
            >
              {(() => {
                const { _score, __debug, ...clean } = item || {};
                return <ActItem actData={clean} />;
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RelatedActs;