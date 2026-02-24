



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

  // Exclude Manager/Admin rows from performer count + instrument list
  const performers = members.filter((m) => {
    const role = String(m?.instrument || "").trim().toLowerCase();
    return role && role !== "manager" && role !== "admin";
  });

  // Prefer explicit actSize if present (e.g. "6-Piece"), else count performers
  const countLabel =
    (lineup?.actSize && String(lineup.actSize).trim()) ||
    `${performers.length}-Piece`;

  // Only essential performer instruments
  const instruments = performers
    .filter((m) => m?.isEssential)
    .map((m) => String(m?.instrument || "").trim())
    .filter(Boolean);

  // Sort: vocals first, drums last (same intent as before)
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

  // Essential roles, but only from performer members
  const roles = performers.flatMap((member) =>
    (Array.isArray(member?.additionalRoles) ? member.additionalRoles : [])
      .filter((r) => r?.isEssential)
      .map((r) => String(r?.role || "Unnamed Service").trim())
      .filter(Boolean)
  );

  if (performers.length === 0) return "Add a Lineup";

  // Turn ["Lead Female Vocal","Lead Female Vocal","Bass Guitar"] into:
  // ["Lead Female Vocal x 2","Bass Guitar"]
  const formatWithCounts = (arr) => {
    const counts = new Map();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    const expanded = [];
    for (const [name, n] of counts.entries()) {
      expanded.push(n > 1 ? `${name} x ${n}` : name);
    }

    // Keep a stable order based on first appearance in original array
    expanded.sort((x, y) => {
      const baseX = x.replace(/\s+x\s+\d+$/i, "");
      const baseY = y.replace(/\s+x\s+\d+$/i, "");
      return arr.findIndex((v) => v === baseX) - arr.findIndex((v) => v === baseY);
    });

    if (expanded.length === 0) return "";
    if (expanded.length === 1) return expanded[0];
    if (expanded.length === 2) return `${expanded[0]} & ${expanded[1]}`;
    return `${expanded.slice(0, -1).join(", ")} & ${expanded[expanded.length - 1]}`;
  };

  const instrumentsStr = formatWithCounts(instruments);
  const rolesStr = roles.length ? ` (including ${formatWithCounts(roles)} services)` : "";

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