import test from "node:test";
import assert from "node:assert/strict";

import { resolveEventSheetDeputyVocalist } from "./eventSheetRepertoireSource.js";

test("uses the confirmed deputy vocalist instead of the original band vocalist", () => {
  const annie = {
    musicianId: "annie-profile-id",
    name: "Annie Afrilu",
    role: "Lead Female Vocal",
    status: "confirmed",
  };
  assert.deepEqual(
    resolveEventSheetDeputyVocalist({
      assignedMusicians: [annie],
      actsSummary: [
        {
          bandMembers: [
            {
              _id: "ione-band-member-id",
              firstName: "Ione",
              lastName: "Townsend",
              instrument: "Lead Female Vocal",
            },
          ],
        },
      ],
    }),
    annie,
  );
});

test("keeps the band repertoire when the original vocalist is allocated", () => {
  assert.equal(
    resolveEventSheetDeputyVocalist({
      assignedMusicians: [
        {
          name: "Ione Townsend",
          role: "Lead Female Vocal",
          status: "confirmed",
        },
      ],
      actsSummary: [
        {
          bandMembers: [
            {
              firstName: "Ione",
              lastName: "Townsend",
              instrument: "Lead Female Vocal",
            },
          ],
        },
      ],
    }),
    null,
  );
});

test("uses an explicitly marked deputy when the original lineup is unavailable", () => {
  const deputy = {
    name: "Annie Vegas",
    role: "Lead Female Vocal",
    status: "accepted",
    candidateSource: "act_deputy",
  };
  assert.deepEqual(
    resolveEventSheetDeputyVocalist({ assignedMusicians: [deputy] }),
    deputy,
  );
});
