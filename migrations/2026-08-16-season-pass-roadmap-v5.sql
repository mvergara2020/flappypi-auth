-- =========================================================
-- FLAPPYPI SEASON PASS V5 · 30 DAYS / 15 REWARD MILESTONES
-- Premium is US$3.50 converted to FlappyCoins at checkout.
-- =========================================================

UPDATE platform_seasons
SET pro_usd_cents = 350,
    pro_price_flappycoins = 105000,
    stars_per_tier = 6,
    updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE id IN ('S6','S7');

CREATE TABLE IF NOT EXISTS season_reward_tiers (
  season_id TEXT NOT NULL,
  tier_no INTEGER NOT NULL,
  target_stars INTEGER NOT NULL,
  free_coins INTEGER NOT NULL DEFAULT 0,
  free_spins INTEGER NOT NULL DEFAULT 0,
  premium_coins INTEGER NOT NULL DEFAULT 0,
  premium_spins INTEGER NOT NULL DEFAULT 0,
  is_jackpot INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (season_id,tier_no)
);

CREATE INDEX IF NOT EXISTS idx_season_reward_tiers_active
ON season_reward_tiers(season_id,enabled,tier_no);

DELETE FROM season_reward_tiers WHERE season_id IN ('S6','S7');

INSERT INTO season_reward_tiers
(season_id,tier_no,target_stars,free_coins,free_spins,premium_coins,premium_spins,is_jackpot,enabled,created_at,updated_at)
WITH v(tier_no,target_stars,free_coins,free_spins,premium_coins,premium_spins,is_jackpot) AS (
  VALUES
    (1,6,500,0,1000,0,0),
    (2,12,650,0,1300,1,0),
    (3,18,800,1,1600,2,0),
    (4,24,950,0,1900,1,0),
    (5,30,1200,1,2400,2,0),
    (6,36,1400,0,2800,1,0),
    (7,42,1600,1,3200,2,0),
    (8,48,1850,1,3700,2,0),
    (9,54,2100,1,4200,2,0),
    (10,60,2500,2,5000,4,0),
    (11,66,2800,1,5600,2,0),
    (12,72,3200,2,6400,4,0),
    (13,78,3800,2,7600,4,0),
    (14,84,4500,3,9000,6,0),
    (15,90,10000,5,25000,12,1)
)
SELECT s.id,v.tier_no,v.target_stars,v.free_coins,v.free_spins,v.premium_coins,v.premium_spins,v.is_jackpot,1,
       CAST(strftime('%s','now') AS INTEGER) * 1000,
       CAST(strftime('%s','now') AS INTEGER) * 1000
FROM platform_seasons s
CROSS JOIN v
WHERE s.id IN ('S6','S7');

CREATE TABLE IF NOT EXISTS platform_economy_config (
  config_key TEXT PRIMARY KEY,
  numeric_value REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO platform_economy_config (config_key,numeric_value,updated_at)
VALUES ('flappycoins_per_usd',30000,CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT(config_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS season_pass_flappycoin_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  usd_cents INTEGER NOT NULL,
  flappycoins_per_usd REAL NOT NULL,
  flappycoins_spent INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id,season_id)
);

CREATE INDEX IF NOT EXISTS idx_season_pass_fc_purchases_season
ON season_pass_flappycoin_purchases(season_id,created_at);
