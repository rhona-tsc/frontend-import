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

import { mergeEventSheetEmergencyContactRefresh } from './eventSheetActMedia.js';
test('contact refresh cannot overwrite the paid deposit, balance, invoice method or saved answers',()=>{
 const previous={totals:{depositAmount:500,remainingAmount:3110},balancePaymentMethod:'invoice',eventSheet:{answers:{free_notes:'NYD lunch'},emergencyContact:{number:'old'}}};
 const merged=mergeEventSheetEmergencyContactRefresh(previous,{totals:{depositAmount:0,remainingAmount:3610},balancePaymentMethod:'stripe',eventSheet:{answers:{},emergencyContact:{number:'new'}}});
 assert.deepEqual(merged.totals,previous.totals);
 assert.equal(merged.balancePaymentMethod,'invoice');
 assert.equal(merged.eventSheet.answers.free_notes,'NYD lunch');
 assert.equal(merged.eventSheet.emergencyContact.number,'new');
});

test('refreshes band contacts even when the emergency number and code stay the same', () => {
 const previous = {contactRouting:{proxyNumber:'+447882963384',ivrCode:'12345',targets:[{name:'Previous player'}]},eventSheet:{answers:{notes:'Keep this'}}};
 const updated = {contactRouting:{proxyNumber:'+447882963384',ivrCode:'12345',targets:[{name:'Confirmed replacement'}]}};
 const merged = mergeEventSheetEmergencyContactRefresh(previous, updated);
 assert.deepEqual(merged.contactRouting.targets, updated.contactRouting.targets);
 assert.equal(merged.eventSheet.answers.notes, 'Keep this');
});
