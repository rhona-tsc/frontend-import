export const SETLIST_CONTROL_OPTIONS = [
  { value: 'smallTailoring', label: 'Signature Setlist' },
  { value: 'mediumTailoring', label: 'Collaborative Setlist' },
  { value: 'largeTailoring', label: 'Fully Tailored Setlist' },
];

export const SETLIST_CONTROL_LABELS = Object.fromEntries(
  SETLIST_CONTROL_OPTIONS.map(({ value, label }) => [value, label]),
);

export function matchesSetlistControl(act, selected = []) {
  if (!Array.isArray(selected) || selected.length === 0) return true;
  const value = act?.setlist || act?.__card?.setlist || '';
  return selected.includes(value);
}
