import test from "node:test";
import assert from "node:assert/strict";

import { isEntertainmentNationBooking } from "./eventSheetBookingSource.js";

test("identifies Entertainment Nation bookings", () => {
  assert.equal(isEntertainmentNationBooking({ agent: "Entertainment Nation" }), true);
  assert.equal(isEntertainmentNationBooking({ bookingSource: "entertainment-nation" }), true);
});

test("leaves other booking sources unchanged", () => {
  assert.equal(isEntertainmentNationBooking({ agent: "Direct" }), false);
  assert.equal(isEntertainmentNationBooking({ agent: "Encore" }), false);
});
