import test from "node:test";
import assert from "node:assert/strict";

import {
  mergeEventSheetBookingRefresh,
  resolveEventSheetActMedia,
} from "./eventSheetActMedia.js";

test("uses embedded act videos even when the context act is a slim record", () => {
  const media = resolveEventSheetActMedia({
    booking: {
      actsSummary: [
        {
          actId: "act-1",
          act: { tscVideos: [{ url: "https://youtu.be/promo" }] },
        },
      ],
    },
    acts: [{ _id: "act-1", name: "Slim act without media" }],
  });
  assert.deepEqual(media.videos, ["https://youtu.be/promo"]);
});

test("emergency contact refresh preserves act media and booked name", () => {
  const merged = mergeEventSheetBookingRefresh(
    {
      actName: "Rhythm Mystique",
      actsSummary: [
        {
          actName: "Rhythm Mystique",
          tscVideos: [{ url: "https://youtu.be/promo" }],
          act: { _id: "act-1" },
        },
      ],
    },
    {
      _id: "booking-1",
      actsSummary: [{ actName: "Motown Magic" }],
      contactRouting: { ivrCode: "1234" },
    },
  );
  assert.equal(merged.actName, "Rhythm Mystique");
  assert.equal(merged.actsSummary[0].actName, "Rhythm Mystique");
  assert.equal(merged.actsSummary[0].tscVideos[0].url, "https://youtu.be/promo");
  assert.equal(merged.contactRouting.ivrCode, "1234");
});
