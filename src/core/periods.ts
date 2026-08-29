// SPEC: pure recompute per §4.5; takes daily logs (date+flow), returns Period[]
export interface Period { start_date: string; end_date: string; length_days: number; cycle_length: number | null; is_outlier: boolean; }

export function recomputePeriods(logs: { date: string; flow: string }[]): Period[] {
  const flowDays = logs.filter(l => l.flow !== 'none').map(l => l.date).sort();
  const runs: { start: string; end: string; length: number }[] = [];
  for (const d of flowDays) {
    if (runs.length === 0) { runs.push({ start: d, end: d, length: 1 }); }
    else {
      const prev = runs[runs.length - 1];
      const gap = daysBetween(prev.end, d); // SPEC: helper from dates
      if (gap > 2) { runs.push({ start: d, end: d, length: 1 }); }
      else { prev.end = d; prev.length = daysBetween(prev.start, d) + 1; }
    }
  }
  // Build Period objects with cycle_length
  const result: Period[] = runs.map((r, i) => {
    const next = runs[i + 1];
    const cycle_length = next ? daysBetween(r.start, next.start) : null;
    const is_outlier = cycle_length !== null && (cycle_length < 21 || cycle_length > 45);
    return { start_date: r.start, end_date: r.end, length_days: r.length, cycle_length, is_outlier };
  });
  return result;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}
