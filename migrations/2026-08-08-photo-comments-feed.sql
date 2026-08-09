-- FlappyPi shared photo comments + global recent feed support.
-- Safe when this migration creates game_photos before platform-local.sql.
-- Runtime also performs the same additive schema check for local/dev compatibility.

CREATE TABLE IF NOT EXISTS game_photos (
  photo_id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS game_photo_likes (
  photo_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (photo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_photos_recent ON game_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_photos_game_recent ON game_photos(game_type, created_at DESC);
