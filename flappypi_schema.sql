-- USERS
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  user_name TEXT UNIQUE,
  eggs INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  last_free_egg_at INTEGER,
  created_at INTEGER NOT NULL
);

-- GAMES
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  game_uid TEXT NOT NULL,
  score INTEGER NOT NULL,
  id_parent INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- GAME REVIVES
CREATE TABLE game_revives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  game_uid TEXT NOT NULL,
  cost INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- EGG REWARDS
CREATE TABLE egg_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_games_user ON games(user_id);
CREATE INDEX idx_games_uid ON games(game_uid);