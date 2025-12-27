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

      if (typeof val === "string") {
        return val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

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

    // e.g. "Vocalist-Guitarist" => ["vocalist","guitarist"]
    const leadWant = tokenizeRole(leadRole || "")
      .concat(tokenizeRole(vWant))
      .filter(Boolean);

    const scoreBreakdown = (a) => {
      const gSource = pickNonEmpty(a?.genres, a?.genre, a?.genreTags, a?.styleTags, a?.styles);
      const iSource = pickNonEmpty(a?.instruments, a?.instrument, a?.instrumentation, a?.lineupInstruments);

      const gHave = norm(gSource);
      const iHave = norm(iSource);
      const vHave = String(a?.vocalist || a?.leadVocalist || "").toLowerCase().trim();

      const haveTokensArr = [
        ...tokenizeRole(a?.leadRole || ""),
        ...tokenizeRole(a?.leadVocalist || ""),
        ...tokenizeRole(a?.vocalist || ""),
        ...tokenizeRole(vHave),
        ...iHave.flatMap((x) => tokenizeRole(x)),
      ];
      const haveTokens = new Set(haveTokensArr);

      const genreMatches = gWant.length ? gHave.filter((g) => gWant.includes(g)).length : 0;
      const instrumentMatched = iWant.length && iHave.some((i) => iWant.includes(i)) ? 1 : 0;

      let leadRoleScore = 0;
      let leadRoleWhy = "no_leadWant";

      if (leadWant.length) {
        const wantSet = Array.from(new Set(leadWant));
        const hasAll = wantSet.every((t) => haveTokens.has(t));

        if (hasAll) {
          leadRoleScore = 12;
          leadRoleWhy = `full_match(+12) want=[${wantSet.join(",")}] have=[${Array.from(haveTokens).join(",")}]`;
        } else {
          let add = 0;
          if (wantSet.includes("vocalist") && haveTokens.has("vocalist")) add += 3;
          if (wantSet.includes("guitarist") && haveTokens.has("guitarist")) add += 2;

          for (const t of wantSet) {
            if (t === "vocalist" || t === "guitarist") continue;
            if (haveTokens.has(t)) add += 2;
          }

          leadRoleScore = Math.min(add, 11);
          leadRoleWhy = `partial_match(+${leadRoleScore}) want=[${wantSet.join(",")}] have=[${Array.from(haveTokens).join(",")}]`;
        }
      }

      const vocalistExact = vWant && vHave === vWant ? 1 : 0;

      const total =
        genreMatches * 10 +
        leadRoleScore +
        vocalistExact * 1 +
        instrumentMatched * 1;

      return {
        total,
        genreMatches,
        leadRoleScore,
        leadRoleWhy,
        instrumentMatched,
        gHave,
        iHave,
        vHave,
        haveTokens: Array.from(new Set(haveTokensArr)),
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
          sampleCardPreview: [],
          scoreTable: [],
          reason: "no_cards",
          usedFallback: false,
        },
      };
    }

    const afterId = list.filter((a) => String(a?.actId || a?._id) !== String(currentActId));
    const afterStatus = afterId.filter((a) => !a?.status || isVisibleStatus(a.status));

    const scored = afterStatus.map((a) => {
      const b = scoreBreakdown(a);
      return { ...a, _score: b.total, _scoreBreakdown: b };
    });

    const positive = scored.filter((a) => (a?._score || 0) > 0);

    const fallback = [...afterStatus]
      .sort((A, B) => Number(B?.loveCount || 0) - Number(A?.loveCount || 0))
      .slice(0, maxToShow);

    const items = (positive.length ? [...positive] : fallback)
      .sort((A, B) => Number(B?._score || 0) - Number(A?._score || 0))
      .slice(0, maxToShow);

    // 🧾 Build a readable table for console.table
    const scoreTable = scored
      .slice()
      .sort((A, B) => Number(B?._score || 0) - Number(A?._score || 0))
      .slice(0, 15)
      .map((a) => {
        const b = a?._scoreBreakdown || {};
        return {
          id: String(a?.actId || a?._id),
          name: a?.name || a?.tscName || a?.title,
          status: a?.status,
          _score: a?._score || 0,
          genreMatches: b.genreMatches ?? 0,
          leadRoleScore: b.leadRoleScore ?? 0,
          instrumentMatched: b.instrumentMatched ?? 0,
          candidateGenres: Array.isArray(b.gHave) ? b.gHave.join(" | ") : "",
          candidateInstruments: Array.isArray(b.iHave) ? b.iHave.join(" | ") : "",
          candidateVocalist: b.vHave || "",
          candidateLeadRole: a?.leadRole || "",
          wantTokens: Array.from(new Set(leadWant)).join(","),
          haveTokens: Array.isArray(b.haveTokens) ? b.haveTokens.join(",") : "",
          leadRoleWhy: b.leadRoleWhy || "",
        };
      });

    const sampleCardPreview = afterStatus.slice(0, 3).map((a) => ({
      id: String(a?.actId || a?._id),
      name: a?.name || a?.tscName || a?.title,
      genres: a?.genres ?? a?.genre,
      instruments: a?.instruments ?? a?.instrument ?? a?.instrumentation,
      vocalist: a?.vocalist ?? a?.leadVocalist,
      leadRole: a?.leadRole,
      lineupSizes: a?.lineupSizes,
    }));

    const debug = {
      listCount: list.length,
      afterIdCount: afterId.length,
      afterStatusCount: afterStatus.length,
      scoredCount: scored.length,
      positiveCount: positive.length,
      finalCount: items.length,
      wants: { gWant, iWant, vWant, leadRole, leadWant },
      sampleCardKeys: list[0] ? Object.keys(list[0]) : [],
      sampleCardPreview,
      scoreTable,
      usedFallback: positive.length === 0,
    };

    return { items, debug };
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
      console.warn("No actCards yet (deferredCards is empty).");
      console.groupEnd();
      return;
    }

    console.log("first card keys:", dbg?.sampleCardKeys || (list[0] ? Object.keys(list[0]) : []));
    console.log("sample cards (raw fields):", dbg?.sampleCardPreview || []);
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

    console.groupCollapsed("[RelatedActs] scoring breakdown (top 15 candidates)");
    console.table(dbg?.scoreTable || []);
    console.groupEnd();

    if (dbg?.usedFallback) {
      console.warn(
        "[RelatedActs] usedFallback=true because positiveCount=0. " +
          "That usually means the cards payload is missing genres/instruments/vocalist/leadRole fields (or they’re empty)."
      );
    }

    console.groupEnd();
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