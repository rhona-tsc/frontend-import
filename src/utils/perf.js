// utils/perf.js
export const perf = {
  start(label) {
    performance.mark(label + ":start");
    console.time(label);
  },
  end(label) {
    performance.mark(label + ":end");
    performance.measure(label, label + ":start", label + ":end");
    console.timeEnd(label);
    const m = performance.getEntriesByName(label).pop();
    if (m) console.log("⏱", label, m.duration.toFixed(1), "ms");
  },
};

export const nextPaint = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));