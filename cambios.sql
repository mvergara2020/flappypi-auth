--- 02-03-2026
CREATE TABLE IF NOT EXISTS ad_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  tid TEXT NOT NULL UNIQUE,
  player_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|rewarded|consumed|rejected
  payload TEXT,
  created_at INTEGER NOT NULL,
  rewarded_at INTEGER,
  consumed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ad_rewards_lookup
ON ad_rewards(provider, reward_type, player_id, status);



--- 05-08-2026

CREATE TABLE IF NOT EXISTS user_game_stats (
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,

  total_points INTEGER NOT NULL DEFAULT 0,
  season_points INTEGER NOT NULL DEFAULT 0,
  season_id TEXT NOT NULL DEFAULT 'S5',

  best_score INTEGER NOT NULL DEFAULT 0,
  total_pipes INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,

  updated_at INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (user_id, game_type)
);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_game_total
ON user_game_stats (
  game_type,
  total_points DESC
);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_game_season
ON user_game_stats (
  game_type,
  season_id,
  season_points DESC
);

ALTER TABLE games
ADD COLUMN game_type TEXT NOT NULL DEFAULT 'legacy';

ALTER TABLE games
ADD COLUMN pipes_passed INTEGER NOT NULL DEFAULT 0;

ALTER TABLE games
ADD COLUMN points_earned INTEGER NOT NULL DEFAULT 0;

ALTER TABLE games
ADD COLUMN scoring_version TEXT NOT NULL DEFAULT 'legacy';
CREATE TABLE IF NOT EXISTS game_sessions (
  game_uid TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  committed_seq INTEGER NOT NULL DEFAULT 0,
  committed_metric INTEGER NOT NULL DEFAULT 0,
  committed_points INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user
ON game_sessions(user_id, game_type, status);



CREATE TABLE IF NOT EXISTS user_game_progress (
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,

  max_level_unlocked INTEGER NOT NULL DEFAULT 1,
  last_selected_level INTEGER NOT NULL DEFAULT 0,

  updated_at INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (user_id, game_type)
);

CREATE INDEX IF NOT EXISTS idx_user_game_progress_game
ON user_game_progress (
  game_type,
  max_level_unlocked DESC
);


ALTER TABLE user_game_stats
ADD COLUMN total_units INTEGER NOT NULL DEFAULT 0;


ALTER TABLE games
ADD COLUMN metric_name TEXT NOT NULL DEFAULT 'score';

ALTER TABLE games
ADD COLUMN metric_value INTEGER NOT NULL DEFAULT 0;

ALTER TABLE games
ADD COLUMN level_id INTEGER NOT NULL DEFAULT 0;

ALTER TABLE games
ADD COLUMN mode TEXT NOT NULL DEFAULT 'infinity';


CREATE UNIQUE INDEX IF NOT EXISTS idx_games_unique_new_game_uid
ON games(game_uid)
WHERE game_type <> 'legacy';