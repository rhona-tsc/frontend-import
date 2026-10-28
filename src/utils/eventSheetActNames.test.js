import assert from "node:assert/strict";
import test from "node:test";

import { resolveEventSheetActNames } from "./eventSheetActNames.js";

test("uses the Booking Board act name for event-sheet copy", () => {
  assert.deepEqual(
    resolveEventSheetActNames({
      booking: {
        actName: "Rhythm Mystique",
        actTscName: "Dancefloor Magic",
      },
      firstAct: {
        actName: "Rhythm Mystique",
        tscName: "Dancefloor Magic",
      },
    }),
    {
      bookedName: "Rhythm Mystique",
      publicName: "Dancefloor Magic",
    },
  );
});

test("preserves an embedded public act name for repertoire lookup", () => {
  assert.deepEqual(
    resolveEventSheetActNames({
      booking: { actName: "Rhythm Mystique" },
      firstAct: {
        actName: "Rhythm Mystique",
        tscName: "Rhythm Mystique",
        act: { tscName: "Dancefloor Magic" },
      },
    }),
    {
      bookedName: "Rhythm Mystique",
      publicName: "Dancefloor Magic",
    },
  );
});

