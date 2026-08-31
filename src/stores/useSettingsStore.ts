import { create } from 'zustand';

import { type OnboardingInput, reseedPlan, resolveOnboarding } from '../core/onboarding';
import * as dailyLogs from '../db/repositories/dailyLogs';
import {
  getSettings,
  SETTINGS_DEFAULTS,
  setSettings,
  type Settings,
} from '../db/repositories/settings';

interface SettingsState {
  settings: Settings;
  /** False until the first read from SQLite finishes. Gate UI on this. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** §6.1 finish: seed the reported period, write settings, flip `onboarding_complete`. */
  completeOnboarding: (input: OnboardingInput, today: string) => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
  /**
   * §6.7 re-seed rule — the user corrects her last period start after onboarding. Clears
   * flow only on the old seeded days that carry nothing she entered herself, seeds the new
   * range, and records it as the new `onboarding_seed_range`.
   */
  changeAnchor: (newStart: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: SETTINGS_DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    const settings = await getSettings();
    set({ settings, hydrated: true });
  },

  completeOnboarding: async (input, today) => {
    const { settings, seedLogs } = resolveOnboarding(input, today);
    // upsert also re-runs recomputePeriods() (§4.4).
    for (const log of seedLogs) {
      await dailyLogs.upsert(log.date, log.flow, [], [], null);
    }
    const onboarding_seed_range =
      seedLogs.length > 0
        ? { start: seedLogs[0].date, end: seedLogs[seedLogs.length - 1].date }
        : null;
    const patch = { ...settings, onboarding_seed_range };
    await setSettings(patch);
    set((state) => ({ settings: { ...state.settings, ...patch } }));
  },

  update: async (patch) => {
    await setSettings(patch);
    set((state) => ({ settings: { ...state.settings, ...patch } }));
  },

  changeAnchor: async (newStart) => {
    const { settings } = get();
    const oldRange = settings.onboarding_seed_range;

    // A day inside the old range the user has touched herself is protected (§6.7, §10.10).
    const protectedDates = oldRange
      ? (await dailyLogs.getRange(oldRange.start, oldRange.end))
          .filter((row) => row.moods.length > 0 || row.symptoms.length > 0 || row.note)
          .map((row) => row.date)
      : [];

    const plan = reseedPlan(oldRange, newStart, settings.reported_period_length, protectedDates);

    await dailyLogs.clearFlowForDates(plan.clear);
    for (const log of plan.seed) {
      // A seed day may already carry mood/symptom/note the user entered — e.g. the new range
      // overlaps a day she logged for an unrelated reason. Only flow is ever set here; her
      // other fields are preserved, never overwritten with empty values (CLAUDE.md rule 10).
      const existing = await dailyLogs.getByDate(log.date);
      await dailyLogs.upsert(
        log.date,
        log.flow,
        existing?.moods ?? [],
        existing?.symptoms ?? [],
        existing?.note ?? null,
      );
    }

    const patch = { onboarding_seed_range: plan.range };
    await setSettings(patch);
    set((state) => ({ settings: { ...state.settings, ...patch } }));
  },
}));
