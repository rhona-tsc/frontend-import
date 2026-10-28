const cleanName = (value) => String(value || "").trim();

export const resolveEventSheetActNames = ({ booking = {}, firstAct = {} } = {}) => {
  const bookedName =
    cleanName(booking?.actName) ||
    cleanName(firstAct?.bookedActName) ||
    cleanName(firstAct?.actName) ||
    cleanName(firstAct?.name) ||
    cleanName(firstAct?.tscName) ||
    "the band";

  // Keep public-profile data separate from the booked/internal act name. The
  // event sheet should say “Rhythm Mystique”, while its repertoire can still
  // be loaded from the linked Dancefloor Magic public profile.
  const publicName =
    cleanName(firstAct?.act?.tscName) ||
    cleanName(firstAct?.tscName) ||
    cleanName(booking?.actTscName) ||
    cleanName(firstAct?.act?.name) ||
    bookedName;

  return { bookedName, publicName };
};

