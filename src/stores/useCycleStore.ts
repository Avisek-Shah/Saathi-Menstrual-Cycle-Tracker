import { create } from 'zustand';

import type { Period } from '../core/periods';
import { predict, type Prediction } from '../core/prediction';
import { weekStripDays } from '../core/home';
import * as dailyLogs from '../db/repositories/dailyLogs';
import { getAllPeriods } from '../db/repositories/periods';
import { useSettingsStore } from './useSettingsStore';

type LogRow = dailyLogs.LogRow;

interface CycleState {
  periods: Period[];
  prediction: Prediction | null;
  todayLog: LogRow | null;
  /** date -> log, for the days shown in the week strip. */
  weekLogs: Record<string, LogRow>;
  ready: boolean;

  /** §5.8 — recompute everything from SQLite. Cheap; call on foreground and after any save. */
  refresh: (today: string) => Promise<void>;
  /** Optimistic write: updates local state now, persists in the background, re-refreshes. */
  saveLog: (
    date: string,
    flow: string,
    moods: string[],
    symptoms: string[],
    note: string | null,
    today: string,
  ) => Promise<void>;
}

export const useCycleStore = create<CycleState>((set, get) => ({
  periods: [],
  prediction: null,
  todayLog: null,
  weekLogs: {},
  ready: false,

  refresh: async (today) => {
    const { settings } = useSettingsStore.getState();
    const periods = await getAllPeriods();
    const week = weekStripDays(today);
    const weekRows = await dailyLogs.getRange(week[0], week[week.length - 1]);
    set({
      periods,
      prediction: predict(periods, settings, today),
      todayLog: (await dailyLogs.getByDate(today)) ?? null,
      weekLogs: Object.fromEntries(weekRows.map((row) => [row.date, row])),
      ready: true,
    });
  },

  saveLog: async (date, flow, moods, symptoms, note, today) => {
    const optimistic: LogRow = { date, flow, moods, symptoms, note };
    set((state) => ({
      todayLog: date === today ? optimistic : state.todayLog,
      weekLogs: { ...state.weekLogs, [date]: optimistic },
    }));
    // upsert also re-runs recomputePeriods() (§4.4); refresh then repredicts.
    await dailyLogs.upsert(date, flow, moods, symptoms, note);
    await get().refresh(today);
  },
}));
