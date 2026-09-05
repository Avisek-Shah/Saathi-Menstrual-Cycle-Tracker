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
    // One transaction, one recomputePeriods() (§4.4) — not one per seeded day. The seed is a
    // contiguous block of `flow = 'medium'` days with nothing else on them.
    await dailyLogs.upsertMany(
      seedLogs.map((log) => ({ date: log.date, flow: log.flow, moods: [], symptoms: [] })),
    );
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

    // A seed day may already carry mood/symptom/note the user entered — e.g. the new range
    // overlaps a day she logged for an unrelated reason. Only flow is ever set here; her other
    // fields are preserved, never overwritten with empty values (CLAUDE.md rule 10). The seed
    // dates are contiguous (`newStart …`), so one range read covers them; `plan.clear` and
    // `plan.seed` are disjoint (reseedPlan), so reading before the clear is safe.
    const existingBySeedDate = new Map(
      plan.seed.length > 0
        ? (await dailyLogs.getRange(plan.seed[0].date, plan.seed[plan.seed.length - 1].date)).map(
            (row) => [row.date, row] as const,
          )
        : [],
    );
    const seedEntries = plan.seed.map((log) => {
      const existing = existingBySeedDate.get(log.date);
      return {
        date: log.date,
        flow: log.flow,
        moods: existing?.moods ?? [],
        symptoms: existing?.symptoms ?? [],
        note: existing?.note ?? null,
      };
    });

    // Two units, each atomic and each rebuilding `periods` once (§4.5 step 6) — was one
    // rebuild for the clear plus one per seeded day.
    await dailyLogs.clearFlowForDates(plan.clear);
    await dailyLogs.upsertMany(seedEntries);

    const patch = { onboarding_seed_range: plan.range };
    await setSettings(patch);
    set((state) => ({ settings: { ...state.settings, ...patch } }));
  },
}));
