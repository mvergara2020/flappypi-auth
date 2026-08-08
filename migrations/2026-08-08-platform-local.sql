-- =========================================================
-- FLAPPYPI PLATFORM - LOCAL DEV SCHEMA
-- Safe to run more than once in the same local D1 database.
-- Existing core tables (users, games, game_revives, ad_rewards,
-- spins, user_game_progress, user_game_stats, game_sessions)
-- are intentionally not recreated here.
-- =========================================================

CREATE TABLE IF NOT EXISTS user_language_preferences (
  user_id TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS season_passes (
  user_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_id TEXT,
  txid TEXT,
  paid_pi REAL,
  paid_usd_cents INTEGER NOT NULL DEFAULT 499,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, season_id)
);

CREATE TABLE IF NOT EXISTS season_payment_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  expected_pi REAL NOT NULL,
  pi_usd_price REAL NOT NULL,
  status TEXT NOT NULL,
  payment_id TEXT,
  txid TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS season_reward_claims (
  user_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  reward_day INTEGER NOT NULL,
  track TEXT NOT NULL,
  coins INTEGER NOT NULL,
  spins INTEGER NOT NULL,
  claimed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, season_id, reward_day, track)
);

CREATE TABLE IF NOT EXISTS rank_reward_claims (
  user_id TEXT NOT NULL,
  rank_no INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  spins INTEGER NOT NULL,
  claimed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, rank_no)
);

CREATE TABLE IF NOT EXISTS collaborators (
  user_id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  joined_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collaborator_supports (
  user_id TEXT PRIMARY KEY,
  collaborator_user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_photos (
  photo_id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS game_stage_star_rewards (
  game_uid TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  level_id INTEGER NOT NULL,
  stars INTEGER NOT NULL,
  performance TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  applied_at INTEGER
);

CREATE TABLE IF NOT EXISTS internal_ad_sessions (
  tid TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_uid TEXT NOT NULL,
  promoted_game TEXT,
  status TEXT NOT NULL,
  ready_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_internal_ad_game
ON internal_ad_sessions (user_id, game_uid, status);

CREATE TABLE IF NOT EXISTS game_ad_revives (
  game_uid TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tid TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
