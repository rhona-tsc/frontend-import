import { cloudinaryImage } from './cloudinaryImage.js';

export const bandImageDelivery = (source, width = 960) => cloudinaryImage(source, width);
export const bandImageSrcSet = source => (cloudinaryImage(source, 480) !== source || cloudinaryImage(source, 960) !== source)
  ? [480, 768, 960].map(width => `${bandImageDelivery(source, width)} ${width}w`).join(', ')
  : undefined;
