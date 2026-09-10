CREATE TABLE IF NOT EXISTS life_profiles (
  device_id TEXT PRIMARY KEY,
  alcohol_start_date TEXT,
  smoking_start_date TEXT,
  alcohol_daily_cost INTEGER NOT NULL DEFAULT 0,
  smoking_daily_cost INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS life_daily (
  device_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  alcohol_result TEXT,
  smoking_count INTEGER,
  smoking_baseline INTEGER,
  condition_score INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (device_id, local_date)
);

CREATE INDEX IF NOT EXISTS idx_life_daily_device_date
ON life_daily(device_id, local_date DESC);

CREATE TABLE IF NOT EXISTS clear_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clear_messages_device_time
ON clear_messages(device_id, created_at DESC);
