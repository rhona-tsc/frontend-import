// src/pages/Act.jsx
import React from "react";
import RelatedActsLazy from "../components/RelatedActsLazy";

// ... other imports and code ...

// Is this act currently shortlisted?
const isShortlisted =
  Array.isArray(shortlistedActs) && actData?._id
    ? shortlistedActs.includes(actData._id)
    : false;

// 🎯 Lead role (compound) used by RelatedActs to find truly similar acts
// IMPORTANT: this must be above any early-returns to avoid Hook order crashes.
const leadRole = React.useMemo(() => {
  try {
    // 1) Prefer explicit fields if you have them
    const explicit =
      (typeof actData?.leadRole === "string" && actData.leadRole.trim()) ||
      (typeof actData?.leadVocalist === "string" && actData.leadVocalist.trim()) ||
      (typeof actData?.vocalist === "string" && actData.vocalist.trim()) ||
      "";

    if (explicit) return explicit;

    // 2) Derive from the smallest lineup
    const lineups = Array.isArray(actData?.lineups) ? actData.lineups : [];
    if (!lineups.length) return "";

    const sizeOf = (l) => {
      const raw = l?.actSize ?? l?.bandMembers?.length ?? 999;
      const n = Number(String(raw).match(/\d+/)?.[0] || raw);
      return Number.isFinite(n) ? n : 999;
    };

    const smallest = [...lineups].sort((a, b) => sizeOf(a) - sizeOf(b))[0];
    const members = Array.isArray(smallest?.bandMembers) ? smallest.bandMembers : [];
    if (!members.length) return "";

    const roleOf = (m) =>
      String(
        m?.customRole ||
          m?.role ||
          m?.instrument ||
          m?.mainInstrument ||
          m?.primaryInstrument ||
          ""
      ).trim();

    const isVocal = (m) => /vocal|singer/i.test(roleOf(m));
    const isCompound = (m) => /guitar|keys|keyboard|piano|dj|sax|trumpet|violin|bongos|perc/i.test(roleOf(m));

    const vocalists = members.filter(isVocal);
    const best =
      vocalists.find(isCompound) ||
      vocalists[0] ||
      members.find(isCompound) ||
      members[0] ||
      null;

    return best ? roleOf(best) : "";
  } catch {
    return "";
  }
}, [
  actData?._id,
  actData?.leadRole,
  actData?.leadVocalist,
  actData?.vocalist,
  actData?.lineups,
]);

// ✅ new: render as soon as actData exists; handle "no lineup" gracefully
if (!actData) {
  return <div className="p-4 text-gray-500">Loading act details...</div>;
}

// ... other code ...

<RelatedActsLazy
  genres={actData.genre || actData.genres || []}
  instruments={actData.instruments || actData.instrumentation || []}
  vocalist={actData.vocalist || ""}
  leadRole={leadRole || ""}
  currentActId={actData._id}
/>