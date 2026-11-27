export const EVENT_SHEET_STAFF_SESSION = 'eventSheetStaffSession';
export const eventSheetUploadPath = (backendUrl, bookingId, action = 'doc') =>
  `${backendUrl}/api/upload/event-sheet/${encodeURIComponent(bookingId)}/${action}`;

export function uploadSessionToken(session, local) {
  return session.getItem(EVENT_SHEET_STAFF_SESSION) || local.getItem('token') || session.getItem('token') || '';
}

// Capability links use a separate scheme: they can never be used as login JWTs.
export function consumeUploadGrant(session,bookingId,location,history) {
  const key=`eventSheetUploadGrant:${bookingId}`;
  const fragment=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
  const incoming=fragment.get('upload');
  if(incoming && /^[A-Za-z0-9_-]{43}$/.test(incoming)) {
    session.setItem(key,incoming);fragment.delete('upload');
    history.replaceState(history.state,'',location.pathname+location.search+(fragment.size?'#'+fragment.toString():''));
  }
}
export function uploadAuthorization(session,local,bookingId,location,history) {
  consumeUploadGrant(session,bookingId,location,history);
  const key=`eventSheetUploadGrant:${bookingId}`;
  const staff=session.getItem(EVENT_SHEET_STAFF_SESSION);
  if(staff)return `Bearer ${staff}`;
  const grant=session.getItem(key);
  if(grant)return `EventSheetUpload ${grant}`;
  const user=uploadSessionToken(session,local);return user?`Bearer ${user}`:'';
}

export function rememberEventSheetReturn(storage, pathname, search = '') {
  const next = pathname.startsWith('/event-sheet/') && !pathname.startsWith('//') ? pathname + search : '/';
  storage.setItem('postLoginNext', next);
}
