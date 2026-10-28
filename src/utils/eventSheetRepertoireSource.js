const clean = (value = "") => String(value || "").trim();

const normaliseName = (value = "") =>
  clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const memberName = (member = {}) =>
  clean(
    member?.name ||
      [member?.firstName, member?.lastName].filter(Boolean).join(" "),
  );

const memberId = (member = {}) =>
  clean(member?.musicianId || member?.musician?._id || member?.id || member?._id);

const isLeadVocalRole = (member = {}) => {
  const role = clean(member?.role || member?.instrument).toLowerCase();
  return /lead.*vocal|vocal.*lead/.test(role);
};

const isConfirmed = (member = {}) =>
  ["accepted", "confirmed"].includes(clean(member?.status).toLowerCase());

const firstNonEmptyArray = (...values) =>
  values.find((value) => Array.isArray(value) && value.length) || [];

export const getEventSheetMusicianName = memberName;
export const getEventSheetMusicianId = memberId;

export const resolveEventSheetDeputyVocalist = (booking = {}) => {
  const firstAct =
    (Array.isArray(booking?.actsSummary) && booking.actsSummary[0]) ||
    (Array.isArray(booking?.items) && booking.items[0]) ||
    {};
  const confirmedVocalists = firstNonEmptyArray(
    booking?.assignedMusicians,
    booking?.bookingMusicians,
    booking?.bandLineup,
  ).filter((member) => isConfirmed(member) && isLeadVocalRole(member));

  if (!confirmedVocalists.length) return null;

  const originalMembers = firstNonEmptyArray(
    firstAct?.bandMembers,
    firstAct?.lineup?.bandMembers,
    firstAct?.act?.bandMembers,
  );
  const originalVocalists = originalMembers.filter(isLeadVocalRole);

  if (!originalVocalists.length) {
    return (
      confirmedVocalists.find(
        (member) =>
          member?.isDeputy === true ||
          clean(member?.candidateSource).toLowerCase() === "act_deputy",
      ) || null
    );
  }

  const originalIds = new Set(originalVocalists.map(memberId).filter(Boolean));
  const originalNames = new Set(
    originalVocalists.map((member) => normaliseName(memberName(member))).filter(Boolean),
  );

  return (
    confirmedVocalists.find((member) => {
      const id = memberId(member);
      const name = normaliseName(memberName(member));
      return !(
        (id && originalIds.has(id)) ||
        (name && originalNames.has(name))
      );
    }) || null
  );
};
