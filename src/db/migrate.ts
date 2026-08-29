import { SCHEMA_VERSION } from './schema';

export async function migrate(db: any) {
  // SPEC: v1 is the only version in v1; runner must exist (§10.9)
  const row = await db.getFirstAsync(`SELECT value FROM settings WHERE key = 'schema_version'`);
  const current = row ? parseInt(row.value, 10) : 0;
  if (current < SCHEMA_VERSION) {
    // No structural migrations needed for v1→v1; just bump
    await db.runAsync(`UPDATE settings SET value = ? WHERE key = 'schema_version'`, SCHEMA_VERSION.toString());
  }
}
