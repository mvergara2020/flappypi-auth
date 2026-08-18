-- FlappyPi user-sponsored promoted moments.

CREATE TABLE IF NOT EXISTS user_sponsors (
  sponsor_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  usd_cents INTEGER NOT NULL DEFAULT 500,
  coin_cost INTEGER NOT NULL,
  coins_per_usd INTEGER NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'PENDING',
  moderation_reason TEXT,
  created_at INTEGER NOT NULL,
  approved_at INTEGER,
  views INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_user_sponsors_status_recent
ON user_sponsors(moderation_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sponsors_user_recent
ON user_sponsors(user_id, created_at DESC);
