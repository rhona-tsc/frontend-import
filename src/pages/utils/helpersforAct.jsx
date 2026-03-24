



  // Calculate average rating from reviews, rounded to nearest 0.5
export const calculateAverageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce(
    (total, review) => total + (review.rating || 0),
    0
  );
  return Math.round((sum / reviews.length) * 2) / 2; // round to nearest 0.5
};

// 🪄 Fetch single availability badge from backend (availability DB)
export async function fetchBadgeForActAndDate(actId, dateISO) {
  if (!actId || !dateISO) return null;
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/availability/badge/${actId}/${dateISO}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("🎯 [fetchBadgeForActAndDate] fetched:", data);
    return data?.badge || null;
  } catch (err) {
    console.warn("⚠️ fetchBadgeForActAndDate failed:", err);
    return null;
  }
}

export const formatDate = (dateString) => {
    if (!dateString) return "No date selected";

    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("en-GB", { month: "long" });
    const year = date.getFullYear();

    // Convert day to "1st", "2nd", "3rd", etc.
    const suffix = ["th", "st", "nd", "rd"][
      day % 10 > 3 ? 0 : ((day % 100) - (day % 10) !== 10) * (day % 10)
    ];

    return `${day}${suffix} of ${month} ${year}`;
  };

export const generateDescription = (lineup) => {
  const members = Array.isArray(lineup?.bandMembers) ? lineup.bandMembers : [];

  const norm = (s = "") => String(s || "").trim();
  const lower = (s = "") => norm(s).toLowerCase();

  const isNonPerformerLikeInstrument = (instrument = "") => {
    const v = lower(instrument);
    return (
      v === "manager" ||
      v === "admin" ||
      v.includes("band manager") ||
      v.includes("management") ||
      v.includes("sound engineer") ||
      v.includes("sound tech") ||
      v.includes("sound technician") ||
      v.includes("audio engineer") ||
      v.includes("audio tech") ||
      v.includes("audio technician") ||
      v.includes("foh") ||
      v.includes("front of house")
    );
  };

  // Count performers (exclude manager/admin/sound tech/non-performer/blank instrument rows)
  const performerMembers = members.filter((m) => {
    if (!m?.isEssential) return false;
    const inst = norm(m?.instrument);
    if (!inst) return false;
    if (m?.isManager === true || m?.isNonPerformer === true) return false;
    if (isNonPerformerLikeInstrument(inst)) return false;
    return true;
  });

  // Label prefix: prefer actSize if provided ("6-Piece"), otherwise build it
  const actSizeLabel = norm(lineup?.actSize);
  const countLabel = actSizeLabel
    ? actSizeLabel
    : `${performerMembers.length}-Piece`;

  // Build instrument list (essential only, excluding non-performer roles / blank)
  let instruments = performerMembers
    .map((m) => norm(m?.instrument))
    .filter(Boolean);

  // Sort (vocals first, drums last)
  instruments.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const isVocal = (str) => str.includes("vocal");
    const isDrums = (str) => str === "drums";

    if (isVocal(aLower) && !isVocal(bLower)) return -1;
    if (!isVocal(aLower) && isVocal(bLower)) return 1;
    if (isDrums(aLower)) return 1;
    if (isDrums(bLower)) return -1;
    return 0;
  });

  const withCountsInOrder = (arr) => {
    const out = [];
    const counts = new Map();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
      if (!out.includes(item)) out.push(item);
    }
    return out.map((item) => {
      const n = counts.get(item) || 1;
      return n > 1 ? `${item} x ${n}` : item;
    });
  };

  const instrumentsDisplayArr = withCountsInOrder(instruments);

  const rolesRaw = members.flatMap((member) =>
    (Array.isArray(member?.additionalRoles) ? member.additionalRoles : [])
      .filter((r) => r?.isEssential)
      .map((r) => norm(r?.role || "Unnamed Service"))
      .filter(Boolean)
  );

  const rolesNormalized = rolesRaw.map((r) => {
    const rLower = lower(r);

    if (rLower.includes("band manager")) return "Band Management";
    if (
      rLower.includes("sound engineer") ||
      rLower.includes("sound tech") ||
      rLower.includes("sound technician") ||
      rLower.includes("audio engineer") ||
      rLower.includes("audio tech") ||
      rLower.includes("audio technician") ||
      rLower.includes("foh") ||
      rLower.includes("front of house")
    ) {
      return "Sound Engineering";
    }

    return r;
  });

  const rolesDisplayArr = withCountsInOrder(rolesNormalized);

  const formatWithAnd = (arr) => {
    const items = Array.isArray(arr) ? arr : [];
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} & ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
  };

  const instrumentsStr = formatWithAnd(instrumentsDisplayArr);
  const rolesStr = rolesDisplayArr.length
    ? ` (including ${formatWithAnd(rolesDisplayArr)} services)`
    : "";

  if (!countLabel || performerMembers.length === 0) return "Add a Lineup";

  return `${countLabel}: ${instrumentsStr}${rolesStr}`;
};

export const numberToWords = (num) => {
    const words = [
      "Zero",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
      "Twenty",
      "Twenty-one",
      "Twenty-two",
      "Twenty-three",
      "Twenty-four",
      "Twenty-five",
      "Twenty-six",
      "Twenty-seven",
      "Twenty-eight",
      "Twenty-nine",
      "Thirty",
    ];
    return words[num] || num;
  };



    export const paMap = {
    smallPA: "small",
    mediumPA: "medium",
    largePA: "large",
  };

  export const lightMap = {
    smallLight: "small",
    mediumLight: "medium",
    largeLight: "large",
  };