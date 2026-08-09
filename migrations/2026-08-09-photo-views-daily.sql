-- FlappyPi photo view deduplication.
-- Stores only a salted/HMAC viewer hash, never the raw IP address.

CREATE TABLE IF NOT EXISTS game_photo_views_daily (
  photo_id TEXT NOT NULL,
  viewer_hash TEXT NOT NULL,
  view_day INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (photo_id,viewer_hash,view_day)
);

CREATE INDEX IF NOT EXISTS idx_game_photo_views_daily_day
ON game_photo_views_daily(view_day);
