CREATE TABLE IF NOT EXISTS p3_asset_registry (
  device_id TEXT NOT NULL,
  asset_kind TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  label TEXT,
  storage_ref TEXT,
  evidence_level TEXT NOT NULL DEFAULT 'reference',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (device_id, asset_kind, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_p3_asset_registry_device_kind
  ON p3_asset_registry(device_id, asset_kind, status);

CREATE TABLE IF NOT EXISTS p3_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_p3_audit_log_device_created
  ON p3_audit_log(device_id, created_at DESC);
