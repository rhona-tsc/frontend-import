const clean = value => String(value || '').trim().replace(/\s+/g, ' ');
const title = value => clean(value).replace(/\b\w/g, letter => letter.toUpperCase());
const join = values => values.length < 2 ? values[0] || '' : `${values.slice(0, -1).join(', ')} & ${values.at(-1)}`;
const rolesOf = member => Array.isArray(member?.additionalRoles) ? member.additionalRoles : [];

export function describeEventSheetLineup(lineup = {}) {
  const members = Array.isArray(lineup?.bandMembers) ? lineup.bandMembers : [];
  const counts = new Map();
  for (const member of members) {
    if (!member) continue;
    const essential = member.isEssential === true || rolesOf(member).some(role => role?.isEssential === true);
    const label = title(member.instrument);
    if (!essential || !label) continue;
    const key = label.toLowerCase();
    const previous = counts.get(key);
    counts.set(key, { label: previous?.label || label, count: (previous?.count || 0) + 1 });
  }
  const weight = label => /vocal/i.test(label) ? 0 : /drum/i.test(label) ? 999 : 100;
  const instruments = [...counts.values()].sort((a, b) => weight(a.label) - weight(b.label)).map(({ label, count }) => count > 1
    ? `${count} × ${/vocal$/i.test(label) ? `${label}s` : label}` : label);
  if (!instruments.length) return '';
  // Shared services are listed once; performer slots retain their counts.
  const services = [...new Set(members.flatMap(member => rolesOf(member)
    .filter(role => role?.isEssential)
    .map(role => title(role.role || role.title || 'Unnamed Service'))))];
  return `${join(instruments)}${services.length ? ` (including ${join(services)} services)` : ''}`;
}

// Booking labels can already contain a full instrument list (including legacy imports).
export function formatEventSheetLineup(label = '', description = '') {
  const text = String(label || '').trim();
  const described = /\([^)]{5,}\)/.test(text) || /:\s*\S/.test(text);
  return [text, description && !described ? description : ''].filter(Boolean).join(' - ');
}
