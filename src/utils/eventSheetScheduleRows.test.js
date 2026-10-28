import test from "node:test";
import assert from "node:assert/strict";

import {
  bookedScheduleServiceLabel,
  buildDefaultScheduleRows,
  performanceSetPlan,
} from "./eventSheetScheduleRows.js";

test("builds three separate sets with Playlist DJ Service between them", () => {
  const rows = buildDefaultScheduleRows({
    booking: {
      performancePlan:
        "2x60 or 3x40 minute sets plus Playlist DJ Service before, between and after sets until curfew",
    },
    arrival: "17:00",
    arrivalMinutes: 17 * 60,
    range: (start, end) => `${start}-${end}`,
  });

  assert.deepEqual(
    rows.slice(4).map((row) => row.activity),
    [
      "First Set",
      "Playlist DJ Service",
      "Second Set",
      "Playlist DJ Service",
      "Third Set",
    ],
  );
  assert.equal(rows[4].notes, "40 minutes");
});

test("uses the booked manned playlist and Band Member DJ labels", () => {
  assert.equal(
    bookedScheduleServiceLabel({
      bookingDetails: { playlistService: "manned_playlist" },
    }),
    "Manned Playlist Service",
  );
  assert.equal(
    bookedScheduleServiceLabel({
      actsSummary: [
        { selectedExtras: [{ name: "Up to 3 Hours Band Member DJ" }] },
      ],
    }),
    "Band Member DJ Service",
  );
});

test("chooses the more detailed set option when the contract offers alternatives", () => {
  assert.deepEqual(
    performanceSetPlan({ performancePlan: "2 × 60 minutes or 3 × 40 minutes" }),
    { sets: 3, length: 40 },
  );
});
