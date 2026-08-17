-- Sponsor promotions are image-only and paid directly with PI.
-- The historical URL/FlappyCoin columns remain for backwards-compatible reads,
-- but new rows store an empty URL and zero FlappyCoin cost.

ALTER TABLE user_sponsors ADD COLUMN paid_pi REAL;
ALTER TABLE user_sponsors ADD COLUMN payment_id TEXT;
ALTER TABLE user_sponsors ADD COLUMN txid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sponsors_payment_id
ON user_sponsors(payment_id)
WHERE payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sponsor_payment_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sponsor_id TEXT NOT NULL UNIQUE,
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  expected_pi REAL NOT NULL,
  pi_usd_price REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED',
  payment_id TEXT,
  txid TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_payment_intents_user
ON sponsor_payment_intents(user_id, created_at DESC);
