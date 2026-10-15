import { useCallback, useEffect, useMemo, useRef } from "react";

const makeRow = (activity, time = "", notes = "") => ({
  id: `schedule_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
  activity,
  time,
  notes,
});

const normaliseTime = (value = "") => String(value || "").trim();

const minutesFromTime = (value = "") => {
  const match = normaliseTime(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const timeFromMinutes = (value) => {
  if (!Number.isFinite(value)) return "";
  const wrapped = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
};

const durationFromValue = (value, fallback) => {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : fallback;
};

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

    const savedRows = Array.isArray(answers.schedule_table_rows)
      ? answers.schedule_table_rows
      : [];
    const legacyGeneratedActivities = new Set([
      "Band arrival",
      "Set-up and soundcheck (90 minutes)",
      "Live performance begins",
      "Performance finishes",
    ]);
    const canReplaceLegacyRows =
      savedRows.length > 0 &&
      savedRows.every(
        (row) =>
          !normaliseTime(row?.activity) &&
          legacyGeneratedActivities.has(normaliseTime(row?.item)),
      );
    if (savedRows.length && !canReplaceLegacyRows) return;

    const legacyCustomRows = Array.isArray(answers.schedule_simple_rows)
      ? answers.schedule_simple_rows.map((row) =>
          makeRow(row.label || "", row.time || "", row.notes || ""),
        )
      : [];
    const firstAct = Array.isArray(booking?.actsSummary)
      ? booking.actsSummary[0] || {}
      : {};
    const lineup = firstAct?.lineup || {};
    const arrival = normaliseTime(
      performance.arrivalTime || answers.schedule_simple_arrival,
    );
    const arrivalMinutes = minutesFromTime(arrival);
    const setupMinutes = durationFromValue(
      lineup?.setupTime || booking?.setupDuration,
      60,
    );
    const soundcheckMinutes = durationFromValue(lineup?.soundcheckTime, 30);
    const changeMinutes = durationFromValue(
      booking?.changeTime || answers.contracted_change_time,
      15,
    );
    const setupEnd = Number.isFinite(arrivalMinutes)
      ? arrivalMinutes + setupMinutes
      : null;
    const soundcheckEnd = Number.isFinite(setupEnd)
      ? setupEnd + soundcheckMinutes
      : null;
    const changeEnd = Number.isFinite(soundcheckEnd)
      ? soundcheckEnd + changeMinutes
      : null;
    const range = (start, end) =>
      Number.isFinite(start) && Number.isFinite(end)
        ? `${timeFromMinutes(start)}–${timeFromMinutes(end)}`
        : "";
    const liveStart = normaliseTime(
      answers.schedule_simple_start || performance.startTime,
    );
    const liveFinish = normaliseTime(
      performance.finishTime || answers.schedule_simple_finish_time,
    );
    const performancePlan = normaliseTime(
      booking?.performancePlan ||
        firstAct?.performancePlan ||
        answers.contracted_performance_plan ||
        "2 × 60 minutes or 3 × 40 minutes",
    );

    handleAnswer("schedule_table_rows", [
      makeRow("Band arrival", arrival),
      makeRow(
        "Setup",
        range(arrivalMinutes, setupEnd),
        `${setupMinutes} minutes`,
      ),
      makeRow(
        "Soundcheck",
        range(setupEnd, soundcheckEnd),
        `${soundcheckMinutes} minutes`,
      ),
      makeRow(
        "Change time",
        range(soundcheckEnd, changeEnd),
        `${changeMinutes} minutes`,
      ),
      makeRow(
        "Live sets",
        liveStart && liveFinish ? `${liveStart}–${liveFinish}` : liveStart,
        performancePlan,
      ),
      ...legacyCustomRows,
    ]);
  }, [
    booking?._id,
    booking?.bookingId,
    performance.arrivalTime,
    performance.finishTime,
    performance.startTime,
    booking?.performancePlan,
    booking?.changeTime,
    answers.schedule_table_rows,
    answers.schedule_simple_rows,
    answers.contracted_change_time,
    answers.contracted_performance_plan,
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
