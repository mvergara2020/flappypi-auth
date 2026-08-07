CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  created_at INTEGER
);


-- 2026-01-10
ALTER TABLE users ADD COLUMN max_level_unlocked INT NOT NULL DEFAULT 1; 
ALTER TABLE users  ADD COLUMN last_selected_level INT NOT NULL DEFAULT 0;



-- 2026-01-21

ALTER TABLE users 
ADD COLUMN welcome_claimed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users 
ADD COLUMN bird_color VARCHAR(20) NOT NULL DEFAULT 'yellow';
ALTER TABLE users ADD COLUMN hearts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE pi_payments
ADD COLUMN shields_given INTEGER DEFAULT 0;


-- =========================
-- SPINS (D1)
-- 1 spin por game_uid final (idempotente)
-- =========================
CREATE TABLE IF NOT EXISTS spins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_uid TEXT NOT NULL,
  status TEXT NOT NULL,                -- PENDING | CLAIMED | CANCELLED
  reward_json TEXT,                    -- JSON string con outcome + tabla usada
  created_at INTEGER NOT NULL,
  claimed_at INTEGER
);

-- Evita doble spin por el mismo game_uid
CREATE UNIQUE INDEX IF NOT EXISTS idx_spins_game_uid ON spins(game_uid);

-- Para encontrar rápido pendientes por usuario
CREATE INDEX IF NOT EXISTS idx_spins_user_status ON spins(user_id, status);

-- (Opcional) para auditoría / analítica
CREATE INDEX IF NOT EXISTS idx_spins_created_at ON spins(created_at);
ALTER TABLE users ADD COLUMN free_spins INTEGER NOT NULL DEFAULT 0;
