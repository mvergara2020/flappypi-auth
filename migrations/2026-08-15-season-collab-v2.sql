-- Configurable 30-day seasons. Dates and economy can be changed in D1
-- without publishing a new Worker build.
CREATE TABLE IF NOT EXISTS platform_seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  pro_usd_cents INTEGER NOT NULL DEFAULT 400,
  pro_price_flappycoins INTEGER NOT NULL DEFAULT 120000,
  stars_per_tier INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  rules_pdf_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_seasons_status_dates
ON platform_seasons(status, starts_at, ends_at);

INSERT OR IGNORE INTO platform_seasons
(id,name,starts_at,ends_at,pro_usd_cents,pro_price_flappycoins,stars_per_tier,status,rules_pdf_url,created_at,updated_at)
VALUES
('S6','SKYFORGE',1786334400000,1788926400000,400,120000,3,'ACTIVE',NULL,1786334400000,1786334400000),
('S7','NEON ORBIT',1789531200000,1792123200000,400,120000,3,'SCHEDULED',NULL,1786334400000,1786334400000);

CREATE TABLE IF NOT EXISTS collaborator_cycles (
  id TEXT PRIMARY KEY,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  recognized_revenue_usd_cents INTEGER NOT NULL DEFAULT 0,
  reward_pool_bps INTEGER NOT NULL DEFAULT 1000,
  reward_pool_usd_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  finalized_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collaborator_supports_target
ON collaborator_supports(collaborator_user_id);

CREATE TABLE IF NOT EXISTS collaborator_monthly_rewards (
  cycle_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rank_no INTEGER NOT NULL,
  supporters INTEGER NOT NULL,
  share_ratio REAL NOT NULL,
  reward_usd_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_reference TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  PRIMARY KEY (cycle_id,user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborator_rewards_user_cycle
ON collaborator_monthly_rewards(user_id,cycle_id);

INSERT OR IGNORE INTO collaborator_cycles
(id,starts_at,ends_at,recognized_revenue_usd_cents,reward_pool_bps,reward_pool_usd_cents,status,created_at,updated_at)
VALUES ('2026-08',1785542400000,1788220800000,0,1000,NULL,'ACTIVE',1785542400000,1785542400000);
