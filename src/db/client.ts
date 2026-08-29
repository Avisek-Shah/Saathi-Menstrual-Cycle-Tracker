import * as SQLite from 'expo-sqlite';
import { SCHEMA_VERSION, CREATE_DAILY_LOGS, IDX_FLOW, CREATE_PERIODS, CREATE_SETTINGS } from './schema';

type DB = SQLite.SQLiteDatabase;

export async function openDB(): Promise<DB> {
  const db = await SQLite.openDatabaseAsync('saathi.db');
  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await runMigrations(db);
  return db;
}

async function runMigrations(db: DB) {
  await db.execAsync(CREATE_DAILY_LOGS);
  await db.execAsync(IDX_FLOW);
  await db.execAsync(CREATE_PERIODS);
  await db.execAsync(CREATE_SETTINGS);
  await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', ?)`, SCHEMA_VERSION.toString());
}
