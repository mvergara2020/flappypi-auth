-- Snake 999: one score claim per signed stage attempt.
-- The token nonce makes retries/idempotent client events safe.
CREATE TABLE IF NOT EXISTS game_stage_run_scores (
  run_nonce TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  stage INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  applied_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_game_stage_run_scores_user_game
  ON game_stage_run_scores (user_id, game_type, created_at DESC);
