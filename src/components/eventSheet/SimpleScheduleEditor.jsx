import { useEffect, useMemo, useCallback, useRef } from "react";

const normalizeScheduleTimeLike = (raw) => {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();

  if (s === "midnight") return { hhmm: "00:00", dayOffset: 1 };
  if (s === "noon") return { hhmm: "12:00", dayOffset: 0 };

  s = s.replace(/[.-]/g, ":").replace(/\s+/g, "");

  const ampm = (s.match(/(am|pm)$/) || [])[1] || null;
  if (ampm) s = s.replace(/(am|pm)$/i, "");

  let h = 0;
  let m = 0;

  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [hh, mm] = s.split(":").map(Number);
    h = hh;
    m = mm;
  } else if (/^\d{3,4}$/.test(s)) {
    const mm = s.slice(-2);
    const hh = s.slice(0, s.length - 2) || "0";
    h = Number(hh);
    m = Number(mm);
  } else if (/^\d{1,2}$/.test(s)) {
    h = Number(s);
    m = 0;
  } else {
    return null;
  }

  if (ampm) {
    const isPM = ampm === "pm";
    const h12 = h % 12;
    h = isPM ? h12 + 12 : h12;
  }

  h = Math.max(0, Math.min(23, h));
  m = Math.max(0, Math.min(59, m));

  return {
    hhmm: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    dayOffset: 0,
  };
};

const formatFixedScheduleTime = (value) => {
  const s = String(value || "").trim();
  if (!s) return "—";

  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return s;

  const H = String(parseInt(m[1], 10)).padStart(2, "0");
  const M = String(parseInt(m[2], 10)).padStart(2, "0");

  return `${H}:${M}`;
};

const TimeBox = ({ value, onChange, disabled }) => (
  <input
    type="text"
    inputMode="numeric"
    pattern="^\\d{1,2}:\\d{2}$"
    placeholder="HH:MM"
    className="border rounded px-2 py-1 text-sm w-full text-gray-800"
    value={value || ""}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
  />
);

export default function SimpleScheduleEditor({
  booking,
  answers,
  handleAnswer,
  readOnly = false,
  getPerformanceTimesFromBooking,
}) {
  const seededRef = useRef(false);
  const dragRowIdRef = useRef(null);

  useEffect(() => {
    seededRef.current = false;
  }, [booking?._id]);

  const perf = useMemo(() => {
    if (typeof getPerformanceTimesFromBooking === "function") {
      return getPerformanceTimesFromBooking(booking) || {};
    }

    return {
      arrivalTime: booking?.arrivalTime || booking?.setup?.arrivalTime || null,
      startTime: booking?.startTime || booking?.performance?.startTime || null,
      finishTime: booking?.finishTime || booking?.performance?.finishTime || null,
      finishDayOffset: booking?.finishDayOffset || 0,
    };
  }, [booking, getPerformanceTimesFromBooking]);

  useEffect(() => {
    if (!booking?._id || seededRef.current) return;

    const patches = {};

    if (!answers.schedule_simple_arrival) {
      if (perf.arrivalTime) {
        const n = normalizeScheduleTimeLike(perf.arrivalTime);
        patches.schedule_simple_arrival = n?.hhmm || "17:00";
      } else {
        patches.schedule_simple_arrival = "17:00";
      }
    }

    if (perf.startTime && !answers.schedule_simple_start) {
      const n = normalizeScheduleTimeLike(perf.startTime);
      if (n?.hhmm) patches.schedule_simple_start = n.hhmm;
    }

    if (perf.finishTime && !answers.schedule_simple_finish_time) {
      const n = normalizeScheduleTimeLike(perf.finishTime);
      if (n?.hhmm) {
        patches.schedule_simple_finish_time = n.hhmm;
        if (answers.schedule_simple_finish_dayOffset == null) {
          patches.schedule_simple_finish_dayOffset = Number.isFinite(Number(perf.finishDayOffset))
            ? Number(perf.finishDayOffset)
            : n.dayOffset || 0;
        }
      }
    }

    if (!Array.isArray(answers.schedule_simple_rows)) {
      patches.schedule_simple_rows = [];
    }

    if (Object.keys(patches).length) {
      Object.entries(patches).forEach(([key, value]) => handleAnswer(key, value));
    }

    seededRef.current = true;
  }, [
    booking?._id,
    perf.arrivalTime,
    perf.startTime,
    perf.finishTime,
    perf.finishDayOffset,
    handleAnswer,
  ]);

  const finishOffset = Number(answers.schedule_simple_finish_dayOffset || 0);

  const rows = Array.isArray(answers.schedule_simple_rows)
    ? answers.schedule_simple_rows
    : [];

  const setRows = useCallback(
    (updater) => {
      const prevRows = Array.isArray(answers.schedule_simple_rows)
        ? answers.schedule_simple_rows
        : [];
      const nextRows =
        typeof updater === "function" ? updater(prevRows) : updater;
      handleAnswer("schedule_simple_rows", nextRows);
    },
    [answers.schedule_simple_rows, handleAnswer]
  );

  const addRow = useCallback(
    (slot = 3) => {
      setRows((prevRows) => [
        ...prevRows,
        {
          id: `row_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
          label: "",
          time: "",
          notes: "",
          slot,
        },
      ]);
    },
    [setRows]
  );

  const updateRowById = useCallback(
    (id, patch) => {
      setRows((prevRows) =>
        prevRows.map((row) => (row.id === id ? { ...row, ...patch } : row))
      );
    },
    [setRows]
  );

  const removeRowById = useCallback(
    (id) => {
      setRows((prevRows) => prevRows.filter((row) => row.id !== id));
    },
    [setRows]
  );

  const SLOT_TITLES = [
    "Before Arrival",
    "Before Setup",
    "Before Soundcheck",
    "Before Start",
    "Before 1st Live Set",
    "Before Intermission",
    "Before 2nd Live Set",
    "Before Finish",
    "After Finish",
  ];

  const SLOT_COUNT = SLOT_TITLES.length;

  const moveRowToSlot = useCallback(
    (id, slot) => {
      const safeSlot = Math.max(0, Math.min(SLOT_COUNT - 1, slot));
      updateRowById(id, { slot: safeSlot });
    },
    [SLOT_COUNT, updateRowById]
  );

  const onDragStartRow = useCallback(
    (id) => (e) => {
      dragRowIdRef.current = id;
      try {
        e.dataTransfer.setData("text/plain", id);
      } catch {}
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const onDropToSlot = useCallback(
    (slot) => (e) => {
      e.preventDefault();
      const id = dragRowIdRef.current || e.dataTransfer.getData("text/plain");
      if (id) moveRowToSlot(id, slot);
      dragRowIdRef.current = null;
    },
    [moveRowToSlot]
  );

  const allowDrop = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const renderRowsInSlot = useCallback(
    (slot) => (
      <div className="space-y-2">
        {rows
          .filter((row) => (row.slot ?? 3) === slot)
          .map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded px-3 py-2 bg-white shadow-sm"
              draggable={!readOnly}
              onDragStart={onDragStartRow(row.id)}
              title="Drag to another position"
            >
              <input
                type="text"
                className="md:col-span-4 border rounded px-2 py-1 text-sm text-gray-800"
                placeholder="Label (e.g. First Dance, Toasts)"
                value={row.label || ""}
                onChange={(e) => updateRowById(row.id, { label: e.target.value })}
                disabled={readOnly}
              />
              <div className="md:col-span-3">
                <TimeBox
                  value={row.time || ""}
                  onChange={(value) => updateRowById(row.id, { time: value })}
                  disabled={readOnly}
                />
              </div>
              <textarea
                rows={2}
                className="md:col-span-4 border rounded px-2 py-1 text-sm text-gray-800"
                placeholder="Notes (optional)"
                value={row.notes || ""}
                onChange={(e) => updateRowById(row.id, { notes: e.target.value })}
                disabled={readOnly}
              />
              <div className="md:col-span-1 flex items-center justify-end gap-1">
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      className="border rounded px-2 py-1 text-xs"
                      onClick={() => moveRowToSlot(row.id, (row.slot ?? 3) - 1)}
                      title="Move to previous slot"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="border rounded px-2 py-1 text-xs"
                      onClick={() => moveRowToSlot(row.id, (row.slot ?? 3) + 1)}
                      title="Move to next slot"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="border rounded px-2 py-1 text-xs"
                      onClick={() => removeRowById(row.id)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>
    ),
    [rows, readOnly, onDragStartRow, updateRowById, moveRowToSlot, removeRowById]
  );

  const renderDropZone = useCallback(
    (slot) => (
      <div
        className="my-2 border-2 border-dashed rounded px-3 py-2 bg-white/50"
        onDragOver={allowDrop}
        onDrop={onDropToSlot(slot)}
        aria-label={`Drop additional rows here (${SLOT_TITLES[slot]})`}
        title={SLOT_TITLES[slot]}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-gray-600">{SLOT_TITLES[slot]}</div>
          {!readOnly && (
            <button
              type="button"
              className="border rounded px-2 py-0.5 text-xs"
              onClick={() => addRow(slot)}
            >
              + Add item
            </button>
          )}
        </div>
        {renderRowsInSlot(slot)}
      </div>
    ),
    [allowDrop, onDropToSlot, SLOT_TITLES, readOnly, addRow, renderRowsInSlot]
  );

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="border rounded px-2 py-1 text-sm"
            onClick={() => addRow(3)}
          >
            + Add custom row
          </button>
        </div>
      )}

      {renderDropZone(0)}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded px-3 py-2 bg-white shadow-sm">
        <div className="md:col-span-4 text-sm font-medium text-gray-800">Arrival Time</div>
        <div className="md:col-span-3">
          <div className="border rounded px-2 py-2 text-sm w-full bg-gray-50 text-gray-900">
            {formatFixedScheduleTime(answers.schedule_simple_arrival || "17:00")}
          </div>
        </div>
        <div className="md:col-span-4">
          <textarea
            rows={2}
            className="border rounded px-2 py-1 text-sm w-full resize-y text-gray-800"
            placeholder="Notes (optional)"
            value={answers.schedule_simple_arrival_notes || ""}
            onChange={(e) => handleAnswer("schedule_simple_arrival_notes", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      {renderDropZone(1)}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded px-3 py-2 bg-white shadow-sm">
        <div className="md:col-span-4 text-sm font-medium text-gray-800">Setup</div>
        <div className="md:col-span-3">
          <TimeBox
            value={answers.schedule_simple_setup || ""}
            onChange={(value) => handleAnswer("schedule_simple_setup", value)}
            disabled={readOnly}
          />
        </div>
        <div className="md:col-span-4">
          <textarea
            rows={2}
            className="border rounded px-2 py-1 text-sm w-full resize-y text-gray-800"
            placeholder="Notes (optional)"
            value={answers.schedule_simple_setup_notes || ""}
            onChange={(e) => handleAnswer("schedule_simple_setup_notes", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      {renderDropZone(2)}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded px-3 py-2 bg-white shadow-sm">
        <div className="md:col-span-4 text-sm font-medium text-gray-800">Soundcheck</div>
        <div className="md:col-span-3">
          <TimeBox
            value={answers.schedule_simple_soundcheck || ""}
            onChange={(value) => handleAnswer("schedule_simple_soundcheck", value)}
            disabled={readOnly}
          />
        </div>
        <div className="md:col-span-4">
          <textarea
            rows={2}
            className="border rounded px-2 py-1 text-sm w-full resize-y text-gray-800"
            placeholder="Notes (optional)"
            value={answers.schedule_simple_soundcheck_notes || ""}
            onChange={(e) => handleAnswer("schedule_simple_soundcheck_notes", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      {renderDropZone(3)}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded px-3 py-2 bg-white shadow-sm">
        <div className="md:col-span-4 text-sm font-medium text-gray-800">Start Time</div>
        <div className="md:col-span-3">
          <TimeBox
            value={answers.schedule_simple_start || ""}
            onChange={(value) => handleAnswer("schedule_simple_start", value)}
            disabled={readOnly}
          />
        </div>
        <div className="md:col-span-4">
          <textarea
            rows={2}
            className="border rounded px-2 py-1 text-sm w-full resize-y text-gray-800"
            placeholder="Notes (optional)"
            value={answers.schedule_simple_start_notes || ""}
            onChange={(e) => handleAnswer("schedule_simple_start_notes", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      {renderDropZone(4)}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded px-3 py-2 bg-white shadow-sm">
        <div className="md:col-span-4 text-sm font-medium text-gray-800">1st Live Set</div>
        <div className="md:col-span-3">
          <TimeBox
            value={answers.schedule_simple_set1 || ""}
            onChange={(value) => handleAnswer("schedule_simple_set1", value)}
            disabled={readOnly}
          />
        </div>
        <div className="md:col-span-4">
          <textarea
            rows={2}
            className="border rounded px-2 py-1 text-sm w-full resize-y text-gray-800"
            placeholder="Notes (optional)"
            value={answers.schedule_simple_set1_notes || ""}
            onChange={(e) => handleAnswer("schedule_simple_set1_notes", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      {renderDropZone(5)}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded px-3 py-2 bg-white shadow-sm">
        <div className="md:col-span-4 text-sm font-medium text-gray-800">Intermission</div>
        <div className="md:col-span-3">
          <TimeBox
            value={answers.schedule_simple_between1 || ""}
            onChange={(value) => handleAnswer("schedule_simple_between1", value)}
            disabled={readOnly}
          />
        </div>
        <div className="md:col-span-4">
          <textarea
            rows={2}
            className="border rounded px-2 py-1 text-sm w-full resize-y text-gray-800"
            placeholder="Notes (optional)"
            value={answers.schedule_simple_between1_notes || ""}
            onChange={(e) => handleAnswer("schedule_simple_between1_notes", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      {renderDropZone(6)}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded px-3 py-2 bg-white shadow-sm">
        <div className="md:col-span-4 text-sm font-medium text-gray-800">2nd Live Set</div>
        <div className="md:col-span-3">
          <TimeBox
            value={answers.schedule_simple_set2 || ""}
            onChange={(value) => handleAnswer("schedule_simple_set2", value)}
            disabled={readOnly}
          />
        </div>
        <div className="md:col-span-4">
          <textarea
            rows={2}
            className="border rounded px-2 py-1 text-sm w-full resize-y text-gray-800"
            placeholder="Notes (optional)"
            value={answers.schedule_simple_set2_notes || ""}
            onChange={(e) => handleAnswer("schedule_simple_set2_notes", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      {renderDropZone(7)}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded px-3 py-2 bg-white shadow-sm">
        <div className="md:col-span-4 text-sm font-medium text-gray-800">Finish Time</div>
        <div className="md:col-span-3">
          <div className="border rounded px-2 py-2 text-sm w-full bg-gray-50 text-gray-900">
            {formatFixedScheduleTime(answers.schedule_simple_finish_time || "")}
            {finishOffset === 1 ? (
              <span className="ml-2 text-xs text-gray-500">(next day)</span>
            ) : null}
          </div>
        </div>
        <div className="md:col-span-4">
          <textarea
            rows={2}
            className="border rounded px-2 py-1 text-sm w-full resize-y text-gray-800"
            placeholder="Notes (optional)"
            value={answers.schedule_simple_finish_notes || ""}
            onChange={(e) => handleAnswer("schedule_simple_finish_notes", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      {renderDropZone(8)}
    </div>
  );
}