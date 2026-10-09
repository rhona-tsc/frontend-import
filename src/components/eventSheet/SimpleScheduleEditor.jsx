import { useCallback, useEffect, useMemo, useRef } from "react";

const makeRow = (activity, time = "", notes = "") => ({
  id: `schedule_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
  activity,
  time,
  notes,
});

const normaliseTime = (value = "") => String(value || "").trim();

export default function SimpleScheduleEditor({
  booking,
  answers,
  handleAnswer,
  readOnly = false,
  getPerformanceTimesFromBooking,
}) {
  const seededBookingRef = useRef("");
  const performance = useMemo(() => {
    if (typeof getPerformanceTimesFromBooking === "function") {
      return getPerformanceTimesFromBooking(booking) || {};
    }
    return {
      arrivalTime: booking?.arrivalTime || "",
      startTime: booking?.startTime || "",
      finishTime: booking?.finishTime || "",
    };
  }, [booking, getPerformanceTimesFromBooking]);

  const rows = Array.isArray(answers.schedule_table_rows)
    ? answers.schedule_table_rows
    : [];

  useEffect(() => {
    const bookingKey = String(booking?._id || booking?.bookingId || "booking");
    if (seededBookingRef.current === bookingKey) return;
    seededBookingRef.current = bookingKey;
    if (Array.isArray(answers.schedule_table_rows)) return;

    const legacyCustomRows = Array.isArray(answers.schedule_simple_rows)
      ? answers.schedule_simple_rows.map((row) =>
          makeRow(row.label || "", row.time || "", row.notes || ""),
        )
      : [];
    handleAnswer("schedule_table_rows", [
      makeRow("Band arrival", normaliseTime(performance.arrivalTime || answers.schedule_simple_arrival)),
      makeRow("Band setup", normaliseTime(answers.schedule_simple_setup), "Allow approximately 60 minutes"),
      makeRow("Soundcheck", normaliseTime(answers.schedule_simple_soundcheck), "Allow approximately 30 minutes"),
      makeRow("Band meal", "", "Allow approximately 30 minutes"),
      makeRow("DJ / playlist starts", normaliseTime(answers.schedule_simple_start || performance.startTime)),
      makeRow("1st live set", normaliseTime(answers.schedule_simple_set1)),
      makeRow("DJ / playlist between sets", normaliseTime(answers.schedule_simple_between1)),
      makeRow("2nd live set", normaliseTime(answers.schedule_simple_set2)),
      makeRow("3rd live set"),
      makeRow("Finish", normaliseTime(performance.finishTime || answers.schedule_simple_finish_time)),
      ...legacyCustomRows,
    ]);
  }, [
    booking?._id,
    booking?.bookingId,
    performance.arrivalTime,
    performance.finishTime,
    performance.startTime,
    answers.schedule_table_rows,
    answers.schedule_simple_rows,
    handleAnswer,
  ]);

  const setRows = useCallback(
    (nextRows) => handleAnswer("schedule_table_rows", nextRows),
    [handleAnswer],
  );
  const updateRow = (id, patch) =>
    setRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const removeRow = (id) => setRows(rows.filter((row) => row.id !== id));
  const moveRow = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  };
  const addRow = () => setRows([...rows, makeRow("")]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-950">
        Add whatever timings you know—you do not need to complete them in order.
        Leave unknown times blank. We can reorder and finish the running order with you later.
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="hidden grid-cols-[minmax(180px,2fr)_minmax(110px,1fr)_minmax(180px,2fr)_110px] gap-2 border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 md:grid">
          <span>Activity</span><span>Time</span><span>Notes (optional)</span><span />
        </div>
        <div className="divide-y">
          {rows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-1 gap-2 px-3 py-3 md:grid-cols-[minmax(180px,2fr)_minmax(110px,1fr)_minmax(180px,2fr)_110px] md:items-center">
              <label className="text-xs font-semibold text-gray-600 md:hidden">Activity</label>
              <input type="text" className="min-w-0 rounded border px-2 py-2 text-sm" placeholder="e.g. Speeches, first dance, live set" value={row.activity || ""} onChange={(event) => updateRow(row.id, { activity: event.target.value })} disabled={readOnly} />
              <label className="text-xs font-semibold text-gray-600 md:hidden">Time</label>
              <input type="text" className="min-w-0 rounded border px-2 py-2 text-sm" placeholder="e.g. 7:30pm" value={row.time || ""} onChange={(event) => updateRow(row.id, { time: event.target.value })} disabled={readOnly} />
              <label className="text-xs font-semibold text-gray-600 md:hidden">Notes (optional)</label>
              <input type="text" className="min-w-0 rounded border px-2 py-2 text-sm" placeholder="Any useful detail" value={row.notes || ""} onChange={(event) => updateRow(row.id, { notes: event.target.value })} disabled={readOnly} />
              {!readOnly ? (
                <div className="flex justify-end gap-1">
                  <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => moveRow(index, -1)} disabled={index === 0} title="Move up">↑</button>
                  <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => moveRow(index, 1)} disabled={index === rows.length - 1} title="Move down">↓</button>
                  <button type="button" className="rounded border px-2 py-1 text-xs text-red-600" onClick={() => removeRow(row.id)} title="Remove row">✕</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {!readOnly ? (
        <button type="button" className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50" onClick={addRow}>
          + Add another row
        </button>
      ) : null}
    </div>
  );
}
