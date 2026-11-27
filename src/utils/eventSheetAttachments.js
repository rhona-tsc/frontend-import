export const SECTION_ATTACHMENTS = {
  location: { key: 'location_documents', help: 'Attach venue access maps, delivery instructions or loading-in information.' },
  parking: { key: 'parking_documents', help: 'Attach parking permits, parking maps or arrival instructions.' },
  room_area: { key: 'room_area_documents', help: 'Attach floor plans, room layouts or photos of the performance area.' },
};
export const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const MAX_SECTION_ATTACHMENTS = 10;
export function validateEventSheetAttachment(file) {
  if (!/\.(pdf|docx?|jpe?g|png|webp)$/i.test(file.name || '')) return 'Please choose a PDF, Word document, JPEG, PNG or WebP image.';
  if (!file.size || file.size > MAX_ATTACHMENT_BYTES) return 'Please choose a non-empty file smaller than 20 MB.';
  return '';
}
export function safeAttachmentUrl(url) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : ''; }
  catch { return ''; }
}
