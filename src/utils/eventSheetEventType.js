const clean = (value) => String(value || "").trim();

export const getBookingEventType = (booking = {}) =>
  clean(
    booking?.eventType ||
      booking?.event_type ||
      booking?.bookingDetails?.eventType,
  );

export const resolveEventSheetEventType = (booking = {}, answers = {}) =>
  getBookingEventType(booking) || clean(answers?.event_type);

export const applyAuthoritativeEventType = (booking = {}, answers = {}) => {
  const eventType = getBookingEventType(booking);
  return eventType ? { ...answers, event_type: eventType } : { ...answers };
};
