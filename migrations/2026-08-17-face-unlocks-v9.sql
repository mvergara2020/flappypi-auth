-- Paid camera-face ownership. Prices are recorded at purchase time so later
-- economy-rate changes do not alter the audit trail of previous purchases.
CREATE TABLE IF NOT EXISTS user_face_unlocks (
  user_id TEXT NOT NULL,
  face_id TEXT NOT NULL,
  purchase_id TEXT NOT NULL UNIQUE,
  usd_cents INTEGER NOT NULL,
  flappycoins_per_usd REAL NOT NULL,
  flappycoins_spent INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, face_id)
);

CREATE INDEX IF NOT EXISTS idx_user_face_unlocks_user
ON user_face_unlocks(user_id, created_at DESC);
