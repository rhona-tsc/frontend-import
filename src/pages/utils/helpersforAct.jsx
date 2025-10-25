



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

export  const generateDescription = (lineup) => {
  const count =
    lineup?.actSize ||
    (Array.isArray(lineup?.bandMembers) ? lineup.bandMembers.length : 0);

  const instruments = (lineup?.bandMembers || [])
    .filter((m) => m?.isEssential)
    .map((m) => m?.instrument)
    .filter(Boolean);

  instruments.sort((a, b) => {
    const aLower = a?.toLowerCase?.() || "";
    const bLower = b?.toLowerCase?.() || "";
    const isVocal = (str) => str.includes("vocal");
    const isDrums = (str) => str === "drums";
    if (isVocal(aLower) && !isVocal(bLower)) return -1;
    if (!isVocal(aLower) && isVocal(bLower)) return 1;
    if (isDrums(aLower)) return 1;
    if (isDrums(bLower)) return -1;
    return 0;
  });

  const roles = (lineup?.bandMembers || []).flatMap((member) =>
    (member?.additionalRoles || [])
      .filter((r) => r?.isEssential)
      .map((r) => r?.role || "Unnamed Service")
  );

  if (count === 0) return "Add a Lineup";

  const formatWithAnd = (arr) => {
    const unique = [...new Set(arr)];
    if (unique.length === 0) return "";
    if (unique.length === 1) return unique[0];
    if (unique.length === 2) return `${unique[0]} & ${unique[1]}`;
    return `${unique.slice(0, -1).join(", ")} & ${unique[unique.length - 1]}`;
  };

  const instrumentsStr = formatWithAnd(instruments);
  const rolesStr = roles.length
    ? ` (including ${formatWithAnd(roles)} services)`
    : "";

  return `${count}: ${instrumentsStr}${rolesStr}`;
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