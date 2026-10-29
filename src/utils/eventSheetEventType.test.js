import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAuthoritativeEventType,
  resolveEventSheetEventType,
} from "./eventSheetEventType.js";

test("the booking event type overrides a stale saved event-sheet answer", () => {
  const booking = { eventType: "Corporate Event" };
  const answers = { event_type: "Wedding", partner1_first: "Georgia" };

  assert.equal(resolveEventSheetEventType(booking, answers), "Corporate Event");
  assert.deepEqual(applyAuthoritativeEventType(booking, answers), {
    event_type: "Corporate Event",
    partner1_first: "Georgia",
  });
});

test("saved event type remains the fallback for legacy bookings", () => {
  assert.equal(
    resolveEventSheetEventType({}, { event_type: "Birthday Party" }),
    "Birthday Party",
  );
});
