import type { SQLiteDatabase } from 'expo-sqlite';

import {
  CREATE_DAILY_LOGS,
  CREATE_PERIODS,
  CREATE_SETTINGS,
  IDX_FLOW,
  SCHEMA_VERSION,
} from './schema';

/**
 * The single migration runner (§10.9 — "Do not skip this"). Called once per app start by
 * `openDB()`. v1 has one schema version; the `current < N` blocks are the seam future
 * versions add to.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // settings must exist before we can read the stored schema version.
  await db.execAsync(CREATE_SETTINGS);

  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'schema_version'",
  );
  const current = row ? Number(row.value) : 0;

  if (current >= SCHEMA_VERSION) return;

  // Every version block plus the version write is one transaction: v1's statements are all
  // idempotent `CREATE ... IF NOT EXISTS` so this is currently belt-and-braces, but the
  // `if (current < 2)` seam below won't be — a crash mid-migration must not leave
  // `schema_version` behind half-applied DDL.
  await db.withTransactionAsync(async () => {
    if (current < 1) {
      await db.execAsync(CREATE_DAILY_LOGS);
      await db.execAsync(IDX_FLOW);
      await db.execAsync(CREATE_PERIODS);
    }

    // if (current < 2) { ...structural changes for v2... }

    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('schema_version', ?) " +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      String(SCHEMA_VERSION),
    );
  });
}
