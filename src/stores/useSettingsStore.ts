import { create } from 'zustand';

import { type OnboardingInput, resolveOnboarding } from '../core/onboarding';
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
}

export const useSettingsStore = create<SettingsState>((set) => ({
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
    await setSettings(settings);
    set((state) => ({ settings: { ...state.settings, ...settings } }));
  },

  update: async (patch) => {
    await setSettings(patch);
    set((state) => ({ settings: { ...state.settings, ...patch } }));
  },
}));
