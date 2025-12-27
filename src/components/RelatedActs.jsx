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

const RelatedActs = ({
  genres = [],
  instruments = [],
  vocalist = "",
  leadRole = "",
  currentActId,
}) => {
  const { actCards } = useContext(ShopContext);
  const deferredCards = useDeferredValue(actCards);
  const maxToShow = useMaxToShow();

  // 🔎 DEBUG (toggle off when done)
  const DEBUG_RELATED_ACTS = true;
  const lastDebugSigRef = useRef("");

  const memo = useMemo(() => {
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

      return [String(val)];
    };

    const norm = (val) =>
      toList(val)
        .map((x) => String(x).toLowerCase().trim())
        .filter(Boolean);

    // ---- LeadRole token logic ----
    const normalizeRoleWord = (w) => {
      const s = String(w || "").toLowerCase().trim();
      if (!s) return "";

      if (s === "vocals" || s === "vocal" || s === "singer" || s === "singers") return "vocalist";
      if (s === "guitar" || s === "gtr" || s === "guitars") return "guitarist";
      if (s === "keys" || s === "key" || s === "keyboard") return "keyboardist";
      if (s === "dj" || s === "deejay") return "dj";

      return s;
    };

    const tokenizeRole = (val) => {
      const raw = String(val || "");
      if (!raw.trim()) return [];

      const parts = raw
        .toLowerCase()
        .replace(/[()]/g, " ")
        .replace(/[,_]/g, " ")
        .replace(/[\/|+&]/g, " ")
        .replace(/[-]+/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean)
        .map(normalizeRoleWord)
        .filter(Boolean);

      const stop = new Set(["lead", "male", "female", "front", "person", "main"]);
      return parts.filter((t) => !stop.has(t));
    };

    const isVisibleStatus = (s) => {
      const v = String(s || "").toLowerCase().trim();
      return v.includes("approved") || v.includes("live") || v.includes("active") || v.includes("published");
    };

    const pickNonEmpty = (...candidates) => {
      for (const c of candidates) {
        if (Array.isArray(c) && c.length) return c;
        if (typeof c === "string" && c.trim()) return c;
        if (c && typeof c === "object") return c;
      }
      return [];
    };

    const gWant = norm(genres);
    const iWant = norm(instruments);
    const vWant = String(vocalist || "").toLowerCase().trim();

    // e.g. "vocalist-guitarist" => ["vocalist","guitarist"]
    const leadWant = tokenizeRole(leadRole || "")
      .concat(tokenizeRole(vWant))
      .filter(Boolean);

    // ✅ returns total + breakdown for console/debugging
    const scoreWithBreakdown = (a) => {
      const gSource = pickNonEmpty(a?.genres, a?.genre, a?.genreTags, a?.styleTags, a?.styles);
      const iSource = pickNonEmpty(a?.instruments, a?.instrument, a?.instrumentation, a?.lineupInstruments);

      const gHave = norm(gSource);
      const iHave = norm(iSource);
      const vHave = String(a?.vocalist || a?.leadVocalist || "").toLowerCase().trim();

      const haveTokens = new Set([
        ...tokenizeRole(a?.leadRole || ""),
        ...tokenizeRole(a?.leadVocalist || ""),
        ...tokenizeRole(a?.vocalist || ""),
        ...tokenizeRole(vHave),
        ...iHave.flatMap((x) => tokenizeRole(x)),
      ]);

      const genreMatchList = gWant.length ? gHave.filter((g) => gWant.includes(g)) : [];
      const genreMatches = genreMatchList.length;

      const instrumentMatched = iWant.length && iHave.some((i) => iWant.includes(i));
      const instrumentMatch = instrumentMatched ? 1 : 0;

      let leadRoleScore = 0;
      let leadRoleWhy = "no_lead_want";
      let leadRoleMatchedTokens = [];
      let leadRoleMissingTokens = [];

      if (leadWant.length) {
        const wantSet = Array.from(new Set(leadWant));
        const hasAll = wantSet.every((t) => haveTokens.has(t));

        leadRoleMatchedTokens = wantSet.filter((t) => haveTokens.has(t));
        leadRoleMissingTokens = wantSet.filter((t) => !haveTokens.has(t));

        if (hasAll) {
          leadRoleScore = 12;
          leadRoleWhy = "full_match(+12)";
        } else {
          leadRoleWhy = "partial_match";
          if (wantSet.includes("vocalist") && haveTokens.has("vocalist")) leadRoleScore += 3;
          if (wantSet.includes("guitarist") && haveTokens.has("guitarist")) leadRoleScore += 2;

          for (const t of wantSet) {
            if (t === "vocalist" || t === "guitarist") continue;
            if (haveTokens.has(t)) leadRoleScore += 2;
          }

          leadRoleScore = Math.min(leadRoleScore, 11);
          leadRoleWhy += `(+${leadRoleScore})`;
        }
      }

      const vocalistExact = vWant && vHave === vWant ? 1 : 0;

      const genrePoints = genreMatches * 10;
      const vocalistPoints = vocalistExact * 1;
      const instrumentPoints = instrumentMatch * 1;

      const total = genrePoints + leadRoleScore + vocalistPoints + instrumentPoints;

      return {
        total,
        breakdown: {
          id: String(a?.actId || a?._id),
          name: a?.name || a?.tscName || a?.title,
          status: a?.status,

          // wants
          gWant,
          iWant,
          vWant,
          leadRole,
          leadWant: Array.from(new Set(leadWant)),

          // have (summarised)
          gHave,
          iHave,
          vHave,
          haveTokens: Array.from(haveTokens),

          // scoring pieces
          genreMatches,
          genreMatchList,
          genrePoints,
          leadRoleScore,
          leadRoleWhy,
          leadRoleMatchedTokens,
          leadRoleMissingTokens,
          vocalistExact,
          vocalistPoints,
          instrumentMatched,
          instrumentPoints,

          total,
        },
      };
    };

    if (!list.length) {
      return {
        items: [],
        debug: {
          listCount: 0,
          afterIdCount: 0,
          afterStatusCount: 0,
          scoredCount: 0,
          positiveCount: 0,
          finalCount: 0,
          wants: { gWant, iWant, vWant, leadRole, leadWant },
          sampleCardKeys: [],
          top5Scored: [],
          reason: "no_cards",
        },
      };
    }

    // --- Pipeline ---
    const afterId = list.filter((a) => String(a?.actId || a?._id) !== String(currentActId));
    const afterStatus = afterId.filter((a) => !a?.status || isVisibleStatus(a.status));

    const scored = afterStatus.map((a) => {
      const r = scoreWithBreakdown(a);
      return {
        ...a,
        _score: r.total,
        _scoreBreakdown: r.breakdown, // ✅ attach breakdown for logging
      };
    });

    const positive = scored.filter((a) => (a?._score || 0) > 0);

    const fallback = [...afterStatus]
      .sort((A, B) => Number(B?.loveCount || 0) - Number(A?.loveCount || 0))
      .slice(0, maxToShow);

    const items = (positive.length ? [...positive] : fallback)
      .sort((A, B) => Number(B?._score || 0) - Number(A?._score || 0))
      .slice(0, maxToShow);

    const debug = {
      listCount: list.length,
      afterIdCount: afterId.length,
      afterStatusCount: afterStatus.length,
      scoredCount: scored.length,
      positiveCount: positive.length,
      finalCount: items.length,
      wants: { gWant, iWant, vWant, leadRole, leadWant },
      sampleCardKeys: list[0] ? Object.keys(list[0]) : [],
      top5Scored: scored
        .slice()
        .sort((A, B) => Number(B?._score || 0) - Number(A?._score || 0))
        .slice(0, 5)
        .map((a) => ({
          id: String(a?.actId || a?._id),
          name: a?.name || a?.tscName || a?.title,
          status: a?.status,
          genres: a?.genres ?? a?.genre,
          instruments: a?.instruments ?? a?.instrument,
          vocalist: a?.vocalist ?? a?.leadVocalist,
          leadRole: a?.leadRole,
          _score: a?._score,
          // include mini breakdown bits for quick scan
          leadRoleScore: a?._scoreBreakdown?.leadRoleScore,
          leadRoleWhy: a?._scoreBreakdown?.leadRoleWhy,
          genreMatches: a?._scoreBreakdown?.genreMatches,
          instrumentMatched: a?._scoreBreakdown?.instrumentMatched,
        })),
      usedFallback: positive.length === 0,
    };

    return { items, debug, scoredAll: scored };
  }, [deferredCards, genres, instruments, vocalist, leadRole, currentActId, maxToShow]);

  const related = memo.items;
  const dbg = memo.debug;

  useEffect(() => {
    if (!DEBUG_RELATED_ACTS) return;

    const list = Array.isArray(deferredCards) ? deferredCards : [];

    const sigObj = {
      actCardsType: Array.isArray(actCards) ? "array" : typeof actCards,
      actCardsLen: Array.isArray(actCards) ? actCards.length : 0,
      deferredLen: list.length,
      currentActId: String(currentActId || ""),
      genres,
      instruments,
      vocalist,
      leadRole,
      maxToShow,
      counts: dbg
        ? {
            listCount: dbg.listCount,
            afterIdCount: dbg.afterIdCount,
            afterStatusCount: dbg.afterStatusCount,
            positiveCount: dbg.positiveCount,
            finalCount: dbg.finalCount,
            usedFallback: dbg.usedFallback,
            reason: dbg.reason,
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
    console.log("props:", { genres, instruments, vocalist, leadRole, currentActId, maxToShow });
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
    console.log(
      "pipeline counts:",
      dbg
        ? {
            listCount: dbg.listCount,
            afterIdCount: dbg.afterIdCount,
            afterStatusCount: dbg.afterStatusCount,
            scoredCount: dbg.scoredCount,
            positiveCount: dbg.positiveCount,
            finalCount: dbg.finalCount,
            usedFallback: dbg.usedFallback,
          }
        : null
    );

    console.table(dbg?.top5Scored || []);

    // ✅ NEW: show full breakdown for ONLY the rendered related items
    const breakdownRows = (related || [])
      .map((a) => a?._scoreBreakdown)
      .filter(Boolean)
      .map((b) => ({
        id: b.id,
        name: b.name,
        total: b.total,
        genrePoints: b.genrePoints,
        genreMatches: b.genreMatches,
        leadRoleScore: b.leadRoleScore,
        leadRoleWhy: b.leadRoleWhy,
        matchedTokens: (b.leadRoleMatchedTokens || []).join(", "),
        missingTokens: (b.leadRoleMissingTokens || []).join(", "),
        instrumentMatched: b.instrumentMatched,
        vocalistExact: b.vocalistExact,
      }));

    console.groupCollapsed("[RelatedActs] scoring breakdown (rendered items)");
    console.table(breakdownRows);

    // If you want to drill into one item, expand it here:
    // console.log("full breakdown objects:", (related || []).map(r => r._scoreBreakdown));

    console.groupEnd(); // scoring breakdown
    console.groupEnd(); // main group
  }, [
    DEBUG_RELATED_ACTS,
    actCards,
    deferredCards,
    related,
    dbg,
    genres,
    instruments,
    vocalist,
    leadRole,
    currentActId,
    maxToShow,
  ]);

  return (
    <div className="my-10">
      <div className="text-center text-3xl py-8">
        <Title text1="SIMILAR" text2="ACTS" />
      </div>

      {related.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No similar acts found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
          {related.map((item) => {
            const { _score, _scoreBreakdown, ...clean } = item || {};
            return (
              <div
                key={String(clean.actId || clean._id)}
                style={{ contentVisibility: "auto", containIntrinsicSize: "320px 420px" }}
              >
                <ActItem actData={clean} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RelatedActs;