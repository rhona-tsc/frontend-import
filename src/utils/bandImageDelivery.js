export const bandImageDelivery = (source, width = 960) => {
  if (!String(source || '').startsWith('https://res.cloudinary.com/')) return source;
  const transform = `c_limit,w_${width},f_auto,q_auto`;
  // Keep saved pixel crops before any resizing, or their coordinates would shift.
  if (/\/c_limit,w_\d+,f_auto,q_auto\//.test(source)) return source.replace(/\/c_limit,w_\d+,f_auto,q_auto\//, `/${transform}/`);
  if (/\/v\d+\//.test(source)) return source.replace(/\/(v\d+\/)/, `/${transform}/$1`);
  return source.replace('/upload/', `/upload/${transform}/`);
};
export const bandImageSrcSet = source => String(source || '').startsWith('https://res.cloudinary.com/')
  ? [480, 768, 960].map(width => `${bandImageDelivery(source, width)} ${width}w`).join(', ')
  : undefined;
