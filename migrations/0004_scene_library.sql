CREATE TABLE IF NOT EXISTS scene_assets (
  device_id TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  scene_type TEXT NOT NULL DEFAULT 'ambient',
  qc_status TEXT NOT NULL DEFAULT 'ready',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (device_id, scene_id)
);

CREATE INDEX IF NOT EXISTS idx_scene_assets_device_updated
ON scene_assets(device_id, updated_at DESC);
