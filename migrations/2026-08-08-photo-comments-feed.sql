-- FlappyPi shared photo comments + global recent feed support.
-- Apply to D1 before deploying the matching Worker code.

ALTER TABLE game_photos ADD COLUMN comment TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_game_photos_recent ON game_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_photos_game_recent ON game_photos(game_type, created_at DESC);
