// Never claim a fresh modification time just because a build ran.
export function contentDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp > Date.now()) return undefined;
  return new Date(timestamp).toISOString();
}
