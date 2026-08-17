-- Fast owner-scoped pagination for MY GALLERY.
CREATE INDEX IF NOT EXISTS idx_game_photos_owner_recent
ON game_photos(owner_user_id, created_at DESC);
