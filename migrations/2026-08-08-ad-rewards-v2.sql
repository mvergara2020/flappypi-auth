-- =========================================================
-- FLAPPYPI AD REWARDS LEGACY -> V2
-- ONE-TIME migration for databases where ad_rewards still has:
--   id INTEGER PRIMARY KEY
--   player_id TEXT NOT NULL
--   payload TEXT
-- The current Worker branch expects:
--   id TEXT PRIMARY KEY
--   user_id TEXT NOT NULL
--   payload_json TEXT
--
-- Run this only after confirming the legacy schema with:
--   PRAGMA table_info(ad_rewards);
-- =========================================================

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

ALTER TABLE ad_rewards RENAME TO ad_rewards_legacy_20260808;

CREATE TABLE ad_rewards (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  tid TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload_json TEXT,
  created_at INTEGER NOT NULL,
  rewarded_at INTEGER,
  consumed_at INTEGER
);

INSERT INTO ad_rewards (
  id,
  provider,
  reward_type,
  tid,
  user_id,
  status,
  payload_json,
  created_at,
  rewarded_at,
  consumed_at
)
SELECT
  CAST(id AS TEXT),
  provider,
  reward_type,
  tid,
  player_id,
  status,
  payload,
  created_at,
  rewarded_at,
  consumed_at
FROM ad_rewards_legacy_20260808;

CREATE INDEX IF NOT EXISTS idx_ad_rewards_tid_user_status
ON ad_rewards (tid, user_id, status);

CREATE INDEX IF NOT EXISTS idx_ad_rewards_provider_tid
ON ad_rewards (provider, tid);

DROP TABLE ad_rewards_legacy_20260808;

COMMIT;
PRAGMA foreign_keys = ON;
