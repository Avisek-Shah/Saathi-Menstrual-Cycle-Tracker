export const SCHEMA_VERSION = 1;

export const CREATE_DAILY_LOGS = `CREATE TABLE IF NOT EXISTS daily_logs (
  date TEXT PRIMARY KEY,
  flow TEXT NOT NULL DEFAULT 'none',
  moods TEXT NOT NULL DEFAULT '[]',
  symptoms TEXT NOT NULL DEFAULT '[]',
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);`;
export const IDX_FLOW = `CREATE INDEX IF NOT EXISTS idx_daily_logs_flow ON daily_logs(flow);`;

export const CREATE_PERIODS = `CREATE TABLE IF NOT EXISTS periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT NOT NULL UNIQUE,
  end_date TEXT NOT NULL,
  length_days INTEGER NOT NULL,
  cycle_length INTEGER,
  is_outlier INTEGER NOT NULL DEFAULT 0
);`;

export const CREATE_SETTINGS = `CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;
