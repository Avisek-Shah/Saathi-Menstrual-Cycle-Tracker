import { create } from 'zustand';

import type { Period } from '../core/periods';
import { predict, type Prediction } from '../core/prediction';
import * as dailyLogs from '../db/repositories/dailyLogs';
import { getAllPeriods } from '../db/repositories/periods';
import { useSettingsStore } from './useSettingsStore';

type LogRow = dailyLogs.LogRow;

interface CycleState {
  periods: Period[];
  prediction: Prediction | null;
  todayLog: LogRow | null;
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
  ready: false,

  refresh: async (today) => {
    const { settings } = useSettingsStore.getState();
    const [periods, todayLog] = await Promise.all([getAllPeriods(), dailyLogs.getByDate(today)]);
    set({
      periods,
      prediction: predict(periods, settings, today),
      todayLog: todayLog ?? null,
      ready: true,
    });
  },

  saveLog: async (date, flow, moods, symptoms, note, today) => {
    if (date === today) {
      set({ todayLog: { date, flow, moods, symptoms, note } });
    }
    // upsert also re-runs recomputePeriods() (§4.4); refresh then repredicts.
    await dailyLogs.upsert(date, flow, moods, symptoms, note);
    await get().refresh(today);
  },
}));
