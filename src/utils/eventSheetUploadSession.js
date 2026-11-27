export const EVENT_SHEET_STAFF_SESSION = 'eventSheetStaffSession';
export const eventSheetUploadPath = (backendUrl, bookingId, action = 'doc') =>
  `${backendUrl}/api/upload/event-sheet/${encodeURIComponent(bookingId)}/${action}`;

export function uploadSessionToken(session, local) {
  return session.getItem(EVENT_SHEET_STAFF_SESSION) || local.getItem('token') || session.getItem('token') || '';
}

export function rememberEventSheetReturn(storage, pathname, search = '') {
  const next = pathname.startsWith('/event-sheet/') && !pathname.startsWith('//') ? pathname + search : '/';
  storage.setItem('postLoginNext', next);
}
