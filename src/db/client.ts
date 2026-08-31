import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrate';

const DB_NAME = 'saathi.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Open the app database, running migrations exactly once. The connection is memoised, so
 * repositories can call this freely without re-issuing PRAGMAs or the migration pass.
 */
export function openDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Drop the memoised connection. Test-only — lets a suite start from a fresh open. */
export function resetDbConnectionForTests(): void {
  dbPromise = null;
}
