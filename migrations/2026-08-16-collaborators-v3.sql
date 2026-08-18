-- =========================================================
-- FLAPPYPI COLLABORATORS V3
-- DB is the source of truth for collaborator identity/support.
-- Every existing and future user receives one permanent code.
-- =========================================================

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

-- Remove invalid legacy rows before enforcing the invariant.
DELETE FROM collaborator_supports
WHERE user_id = collaborator_user_id;

-- Collab is automatic: previous paused rows become active.
UPDATE collaborators
SET status = 'ACTIVE', updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE status <> 'ACTIVE';

-- Backfill every user that does not have a collaborator identity yet.
INSERT OR IGNORE INTO collaborators (user_id,code,status,joined_at,updated_at)
SELECT
  u.id,
  'FP-' || substr(hex(randomblob(8)),1,10),
  'ACTIVE',
  COALESCE(u.created_at,CAST(strftime('%s','now') AS INTEGER) * 1000),
  CAST(strftime('%s','now') AS INTEGER) * 1000
FROM users u
LEFT JOIN collaborators c ON c.user_id = u.id
WHERE c.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_collaborators_status_joined
ON collaborators(status,joined_at);

CREATE INDEX IF NOT EXISTS idx_collaborator_supports_target
ON collaborator_supports(collaborator_user_id);

CREATE INDEX IF NOT EXISTS idx_collaborator_supports_updated
ON collaborator_supports(updated_at);

-- New users receive their permanent code without waiting for the UI.
CREATE TRIGGER IF NOT EXISTS trg_users_create_collaborator
AFTER INSERT ON users
BEGIN
  INSERT OR IGNORE INTO collaborators (user_id,code,status,joined_at,updated_at)
  VALUES (
    NEW.id,
    'FP-' || substr(hex(randomblob(8)),1,10),
    'ACTIVE',
    COALESCE(NEW.created_at,CAST(strftime('%s','now') AS INTEGER) * 1000),
    CAST(strftime('%s','now') AS INTEGER) * 1000
  );
END;

-- A player can never support their own collaborator identity.
CREATE TRIGGER IF NOT EXISTS trg_collab_support_no_self_insert
BEFORE INSERT ON collaborator_supports
WHEN NEW.user_id = NEW.collaborator_user_id
BEGIN
  SELECT RAISE(ABORT,'CANNOT_SUPPORT_YOURSELF');
END;

CREATE TRIGGER IF NOT EXISTS trg_collab_support_no_self_update
BEFORE UPDATE OF collaborator_user_id ON collaborator_supports
WHEN NEW.user_id = NEW.collaborator_user_id
BEGIN
  SELECT RAISE(ABORT,'CANNOT_SUPPORT_YOURSELF');
END;

-- Only an existing active collaborator may receive support.
CREATE TRIGGER IF NOT EXISTS trg_collab_support_active_target_insert
BEFORE INSERT ON collaborator_supports
WHEN NOT EXISTS (
  SELECT 1 FROM collaborators c
  WHERE c.user_id = NEW.collaborator_user_id AND c.status = 'ACTIVE'
)
BEGIN
  SELECT RAISE(ABORT,'COLLABORATOR_NOT_ACTIVE');
END;

CREATE TRIGGER IF NOT EXISTS trg_collab_support_active_target_update
BEFORE UPDATE OF collaborator_user_id ON collaborator_supports
WHEN NOT EXISTS (
  SELECT 1 FROM collaborators c
  WHERE c.user_id = NEW.collaborator_user_id AND c.status = 'ACTIVE'
)
BEGIN
  SELECT RAISE(ABORT,'COLLABORATOR_NOT_ACTIVE');
END;

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

CREATE INDEX IF NOT EXISTS idx_collaborator_cycles_status_dates
ON collaborator_cycles(status,starts_at,ends_at);

CREATE INDEX IF NOT EXISTS idx_collaborator_rewards_user_cycle
ON collaborator_monthly_rewards(user_id,cycle_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collaborator_rewards_cycle_rank
ON collaborator_monthly_rewards(cycle_id,rank_no);
