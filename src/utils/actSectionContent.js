export const hasContent = value => {
  if (value == null || value === false) return false;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string') return !!value.trim() && !/^(tbc|n\/a|not specified|description not available|undefined|null)$/i.test(value.trim());
  if (Array.isArray(value)) return value.some(hasContent);
  if (value instanceof Map) return [...value.values()].some(hasContent);
  if (typeof value === 'object') return Object.values(value).some(hasContent);
  return value === true;
};
const hiddenExtras = new Set(['max_dj_hours','max_dj_hour','dj_max_hours','maximum_dj_hours']);
export function visibleExtras(extras, lineupSize) {
  return Object.entries(extras || {}).filter(([key, value]) => {
    const normalized = key.toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const price = typeof value === 'object' ? value?.price : parseFloat(value);
    return !hiddenExtras.has(normalized) && Number.isFinite(Number(price)) && Number(price) > 0 && (!/_per_band_member$/.test(key) || lineupSize > 0);
  });
}
export const hasAcousticSets = lineup => hasContent(lineup?.ceremonySets);

export const hasTechnicalDetails = act => ['paSystem','lightingSystem','electricityRequirements','numberOfSets','lengthOfSets','pli','patCert','usesGenericRiskAssessment'].some(key => hasContent(act?.[key])) || (act?.lineups || []).some(lineup => ['bandMembers','setupTime','soundcheckTime','packdownTime','totalSetupAndSoundcheckTime','electricityRequirements','rider'].some(key => hasContent(lineup?.[key])));
