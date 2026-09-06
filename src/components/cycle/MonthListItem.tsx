import { memo, useEffect, useMemo, useState } from 'react';

import { getMonthGrid, type CalendarSystem } from '../../core/calendar';
import type { Period } from '../../core/periods';
import type { Prediction } from '../../core/prediction';
import type { LogRow } from '../../db/repositories/dailyLogs';
import { MonthGrid } from './MonthGrid';

interface MonthListItemProps {
  year: number;
  month: number;
  system: CalendarSystem;
  today: string;
  periods: Period[];
  prediction: Prediction;
  selected: string | null;
  /** Bumped by the parent on focus and after a save — forces every mounted month to refetch. */
  reloadToken: number;
  onPressDay: (dateIso: string) => void;
  fetchMonthLogs: (start: string, end: string) => Promise<Record<string, LogRow>>;
}

/**
 * One row of the calendar's vertical month list. Owns its own `grid` + `logs` so only the
 * handful of months the `FlatList` actually mounts ever run `getMonthGrid` (BS conversion is
 * not free) or hit the DB — not the whole scrollable history.
 */
function MonthListItemImpl({
  year,
  month,
  system,
  today,
  periods,
  prediction,
  selected,
  reloadToken,
  onPressDay,
  fetchMonthLogs,
}: MonthListItemProps) {
  const grid = useMemo(
    () => getMonthGrid(year, month, system, today),
    [year, month, system, today],
  );
  const rangeStart = grid.cells[0].iso;
  const rangeEnd = grid.cells[grid.cells.length - 1].iso;

  const [logs, setLogs] = useState<Record<string, LogRow>>({});

  useEffect(() => {
    let cancelled = false;
    void fetchMonthLogs(rangeStart, rangeEnd).then((map) => {
      if (!cancelled) setLogs(map);
    });
    return () => {
      cancelled = true;
    };
    // reloadToken only forces a refetch; it carries no data of its own.
  }, [fetchMonthLogs, rangeStart, rangeEnd, reloadToken]);

  return (
    <MonthGrid
      grid={grid}
      today={today}
      periods={periods}
      prediction={prediction}
      monthLogs={logs}
      system={system}
      selected={selected}
      onPressDay={onPressDay}
    />
  );
}

export const MonthListItem = memo(MonthListItemImpl);
