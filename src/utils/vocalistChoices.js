export const choiceKey = (actId, lineupId, date, address) =>
  [actId, lineupId, String(date || "").slice(0, 10), String(address || "").trim()].join("|");
export function matchVocalistChoices(roles = [], selectedIds = []) {
  const ids = new Set(selectedIds.map(String));
  if (ids.size !== roles.length || selectedIds.length !== roles.length) return null;
  const visit = (index, used, choices) => {
    if (index === roles.length) return choices;
    for (const person of roles[index].candidates || []) {
      const id = String(person.musicianId);
      if (!ids.has(id) || used.has(id)) continue;
      const result = visit(index + 1, new Set([...used, id]), [...choices, person]);
      if (result) return result;
    }
    return null;
  };
  return visit(0, new Set(), []);
}

export function restoreVocalistPicks(roles = [], selectedIds = []) {
  const candidates = selectedIds.map(String);
  const visit = (index, used, picks) => {
    if (index === candidates.length) return picks;
    for (const role of roles) {
      if (used.has(role.slotIndex) || !role.candidates.some(person => person.musicianId === candidates[index])) continue;
      const result = visit(index + 1, new Set([...used, role.slotIndex]), { ...picks, [role.slotIndex]: candidates[index] });
      if (result) return result;
    }
    return null;
  };
  return visit(0, new Set(), {}) || {};
}
export function pickVocalist(picks, slotIndex, musicianId) {
  return { ...Object.fromEntries(Object.entries(picks).filter(([, id]) => id !== musicianId)), [slotIndex]: musicianId };
}

export function preferUsualVocalists(roles = []) {
  const preferred = roles.map(role => {
    const usual = role.candidates.filter(person => !person.isDeputy);
    return { ...role, candidates: usual.length ? usual : role.candidates };
  });
  const canFill = (index, used) => {
    if (index === preferred.length) return true;
    return preferred[index].candidates.some(person => !used.has(person.musicianId) && canFill(index + 1, new Set([...used, person.musicianId])));
  };
  return canFill(0, new Set()) ? preferred : roles;
}
export function initialVocalistPicks(roles, selected = []) {
  const picks = restoreVocalistPicks(roles, selected);
  for (const role of roles) {
    const id = role.candidates.length === 1 ? role.candidates[0].musicianId : null;
    if (id && !picks[role.slotIndex] && !Object.values(picks).includes(id)) picks[role.slotIndex] = id;
  }
  return picks;
}
