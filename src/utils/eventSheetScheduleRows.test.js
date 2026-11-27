import test from "node:test";
import assert from "node:assert/strict";

import {
  bookedScheduleServiceLabel,
  buildDefaultScheduleRows,
  performanceSetPlan,
  performanceSetLengths,
  usesMealScheduleTemplate,
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

test('the meal template is limited to new sheets and explicit versions',()=>{
  assert.equal(usesMealScheduleTemplate({createdAt:'2026-11-26T15:00:00Z'}),false);
  assert.equal(usesMealScheduleTemplate({}),false);
  assert.equal(usesMealScheduleTemplate({createdAt:'2026-11-28T00:00:00Z'}),true);
  assert.equal(usesMealScheduleTemplate({createdAt:'2026-11-28T00:00:00Z',eventSheet:{scheduleTemplateVersion:1}}),false);
  assert.equal(usesMealScheduleTemplate({eventSheet:{scheduleTemplateVersion:2}}),true);
});

test('new sheets reserve a 30 minute meal before sets and retain the contracted finish',()=>{
  const rows=buildDefaultScheduleRows({booking:{performancePlan:'2x40 + 1x60'},includeBandMeal:true,
    arrival:'17:00',arrivalMinutes:1020,startTime:'20:00',finishTime:'00:30',range:(a,b)=>a==null||b==null?'':`${a}-${b}`});
  assert.deepEqual(rows.slice(0,6).map(r=>r.activity),['Band arrival','Setup','Soundcheck','Change time','Band meal','First Set']);
  assert.equal(rows[4].time,'1125-1155');
  assert.match(rows[4].notes,/30 minutes/);
  assert.deepEqual(rows.filter(r=>/Set$/.test(r.activity)).map(r=>r.notes),['40 minutes','40 minutes','60 minutes']);
  assert.equal(rows[5].time,'20:00');
  assert.deepEqual(rows.at(-1),{activity:'Band finish',time:'00:30',notes:'Contracted finish time'});
});

test('a meal which cannot fit before the contracted start stays available for a break',()=>{
  const rows=buildDefaultScheduleRows({includeBandMeal:true,arrivalMinutes:1080,startTime:'20:00',range:(a,b)=>`${a}-${b}`});
  assert.equal(rows.find(r=>r.activity==='Band meal').time,'');
  assert.match(rows.find(r=>r.activity==='Band meal').notes,/performance break/);
});

test('contracted set lengths override the illustrative 40/40/60 fallback',()=>{
  assert.deepEqual(performanceSetLengths({performancePlan:'2 x 60 minutes'}),[60,60]);
  assert.deepEqual(performanceSetLengths({performancePlan:'2x60 or 3x40'}),[40,40,40]);
  assert.deepEqual(performanceSetLengths({performanceTimes:{plan:{sets:2,length:45}}}),[45,45]);
  assert.deepEqual(performanceSetLengths({}),[40,40,60]);
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
