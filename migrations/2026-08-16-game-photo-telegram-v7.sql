-- Durable Telegram delivery state for shared game photos.
-- The environment is part of the key so localhost, testnet and mainnet remain isolated.
CREATE TABLE IF NOT EXISTS game_photo_telegram_deliveries (
  photo_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  telegram_chat_id TEXT,
  telegram_message_id TEXT,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sent_at INTEGER,
  PRIMARY KEY (photo_id, environment)
);

CREATE INDEX IF NOT EXISTS idx_game_photo_telegram_status
  ON game_photo_telegram_deliveries (environment, status, updated_at);
