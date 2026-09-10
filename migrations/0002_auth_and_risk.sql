CREATE TABLE IF NOT EXISTS device_auth (
  device_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habit_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  signal_kind TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 1,
  local_hour INTEGER,
  weekday INTEGER,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_signals_device_kind_time
ON habit_signals(device_id, signal_kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_device_hour
ON habit_signals(device_id, local_hour);
