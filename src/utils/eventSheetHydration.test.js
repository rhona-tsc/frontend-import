import test from "node:test";
import assert from "node:assert/strict";

import {
  hasSavedEventSheet,
  resolveEventSheetHydration,
} from "./eventSheetHydration.js";

test("saved server answers override an empty browser cache", () => {
  const result = resolveEventSheetHydration({
    serverEventSheet: {
      answers: {
        venue_name: "Royal Lancaster",
        performance_room: "Nine Kings Suite",
      },
      complete: { venue: true },
      updatedAt: "2026-10-19T17:23:28.539Z",
    },
    cachedEventSheet: { answers: {}, complete: {} },
  });

  assert.equal(result.source, "server");
  assert.equal(result.answers.performance_room, "Nine Kings Suite");
  assert.equal(result.complete.venue, true);
});

test("browser cache remains a recovery fallback when nothing was saved", () => {
  const result = resolveEventSheetHydration({
    serverEventSheet: null,
    cachedEventSheet: {
      answers: { venue_name: "Recovered venue" },
      complete: {},
    },
  });

  assert.equal(result.source, "cache");
  assert.equal(result.answers.venue_name, "Recovered venue");
});

test("an explicitly saved empty server sheet remains authoritative", () => {
  const serverEventSheet = {
    answers: {},
    complete: {},
    submitted: false,
    updatedAt: "2026-10-21T12:00:00.000Z",
  };

  assert.equal(hasSavedEventSheet(serverEventSheet), true);
  assert.deepEqual(
    resolveEventSheetHydration({
      serverEventSheet,
      cachedEventSheet: { answers: { obsolete: "stale" }, complete: {} },
    }).answers,
    {},
  );
});
