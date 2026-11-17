import test from "node:test";
import assert from "node:assert/strict";

import {
  getEventSheetMusicianPublicName,
  resolveEventSheetDeputyVocalist,
  resolveEventSheetVocalists,
} from "./eventSheetRepertoireSource.js";

test('includes both a confirmed lead vocalist and MC, but excludes offers and duplicates', () => {
  const kimi = { musicianId: 'kimi', role: 'Lead Female Vocal', status: 'confirmed' };
  const rya = { musicianId: 'rya', role: 'MC/Rapper', status: 'accepted' };
  assert.deepEqual(resolveEventSheetVocalists({ assignedMusicians: [kimi, rya, rya,
    { musicianId: 'pending', role: 'Lead Vocal', status: 'offered' },
    { musicianId: 'drums', role: 'Drums', status: 'confirmed' }] }), [kimi, rya]);
});

test("uses the public profile initial in the repertoire heading", () => {
  assert.equal(
    getEventSheetMusicianPublicName(
      { firstName: "Annie", lastName: "Afrilu", musicianSlug: "annie-v" },
      {},
    ),
    "Annie V",
  );
});

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
