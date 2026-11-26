export function identifyScheduleRows(rows = [], namespace = "schedule") {
  const used = new Set();
  return rows.map((row, index) => {
    let id = String(row?.id || "");
    if (!id || used.has(id)) {
      const base = `${namespace}_row_${index}`;
      id = base;
      let suffix = 1;
      while (used.has(id)) id = `${base}_${suffix++}`;
    }
    used.add(id);
    return row.id === id ? row : { ...row, id };
  });
}
