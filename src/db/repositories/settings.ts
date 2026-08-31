import { openDB } from '../client';

export type CalendarSystem = 'AD' | 'BS';

/**
 * §4.3 — the days onboarding seeded as flow, so a later change to the last-period date
 * (§6.7 re-seed rule) can clear exactly those days and nothing the user logged herself.
 */
export interface SeedRange {
  start: string;
  end: string;
}

/** The settings key/value store, typed. Mirrors §4.3 exactly. */
export interface Settings {
  onboarding_complete: boolean;
  birth_year: number | null;
  reported_cycle_length: number;
  reported_period_length: number;
  calendar_system: CalendarSystem;
  pin_enabled: boolean;
  notif_period_soon: boolean;
  notif_period_soon_days: number;
  notif_period_today: boolean;
  notif_fertile_start: boolean;
  notif_daily_log: boolean;
  notif_daily_log_time: string; // 'HH:mm'
  schema_version: number;
  // SPEC: 2026-08-31 — not in §4.3. Tracks the §5.6 irregular-cycles notice so it shows
  // once per detection; reset to false when cycles stop being irregular. See DECISIONS.md.
  irregular_notice_seen: boolean;
  // §4.3 (M10). Which days onboarding seeded; null once the user has no seeded period left.
  onboarding_seed_range: SeedRange | null;
  // §6.4 (M10). The one-time "what logging is for" card.
  log_explainer_seen: boolean;
  // §6.2 (M10). Lets a user hide the Home quick-log row.
  quick_log_enabled: boolean;
}

export const SETTINGS_DEFAULTS: Settings = {
  onboarding_complete: false,
  birth_year: null,
  reported_cycle_length: 28,
  reported_period_length: 5,
  calendar_system: 'AD',
  pin_enabled: false,
  notif_period_soon: true,
  notif_period_soon_days: 2,
  notif_period_today: true,
  notif_fertile_start: false,
  notif_daily_log: false,
  notif_daily_log_time: '20:00',
  schema_version: 1,
  irregular_notice_seen: false,
  onboarding_seed_range: null,
  log_explainer_seen: false,
  quick_log_enabled: true,
};

type SettingKey = keyof Settings;

const BOOLEAN_KEYS = new Set<SettingKey>([
  'onboarding_complete',
  'pin_enabled',
  'notif_period_soon',
  'notif_period_today',
  'notif_fertile_start',
  'notif_daily_log',
  'irregular_notice_seen',
  'log_explainer_seen',
  'quick_log_enabled',
]);

/** Keys stored as JSON. `''` means null — `serialize` already collapses null to empty. */
const JSON_KEYS = new Set<SettingKey>(['onboarding_seed_range']);

const NUMBER_KEYS = new Set<SettingKey>([
  'reported_cycle_length',
  'reported_period_length',
  'notif_period_soon_days',
  'schema_version',
]);

function serialize(value: Settings[SettingKey]): string {
  if (value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function deserialize<K extends SettingKey>(key: K, raw: string): Settings[K] {
  if (BOOLEAN_KEYS.has(key)) {
    return (raw === 'true') as Settings[K];
  }
  if (NUMBER_KEYS.has(key)) {
    return Number(raw) as Settings[K];
  }
  if (JSON_KEYS.has(key)) {
    if (raw === '') return null as Settings[K];
    try {
      return JSON.parse(raw) as Settings[K];
    } catch {
      // A corrupt row must not take the app down on launch; treat it as unset.
      return null as Settings[K];
    }
  }
  if (key === 'birth_year') {
    return (raw === '' ? null : Number(raw)) as Settings[K];
  }
  return raw as Settings[K];
}

/** One setting, falling back to its §4.3 default when the row is absent. */
export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  const db = await openDB();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row ? deserialize(key, row.value) : SETTINGS_DEFAULTS[key];
}

/** Every setting, defaults filled in for any missing row. */
export async function getSettings(): Promise<Settings> {
  const db = await openDB();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
  );
  const result: Settings = { ...SETTINGS_DEFAULTS };
  for (const { key, value } of rows) {
    if (key in SETTINGS_DEFAULTS) {
      const typedKey = key as SettingKey;
      Object.assign(result, { [typedKey]: deserialize(typedKey, value) });
    }
  }
  return result;
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: Settings[K],
): Promise<void> {
  const db = await openDB();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    serialize(value),
  );
}

/** Write several settings in one transaction (onboarding finish, §6.1; fixture seeding, §14). */
export async function setSettings(patch: Partial<Settings>): Promise<void> {
  const db = await openDB();
  const entries = (Object.keys(patch) as SettingKey[])
    .filter((key) => patch[key] !== undefined)
    .map((key) => [key, serialize(patch[key] as Settings[SettingKey])] as const);
  await db.withTransactionAsync(async () => {
    for (const [key, raw] of entries) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        key,
        raw,
      );
    }
  });
}
