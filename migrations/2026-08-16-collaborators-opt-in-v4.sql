-- =========================================================
-- FLAPPYPI COLLABORATORS V4 · EXPLICIT OPT-IN
-- A user becomes a collaborator only through POST /join.
-- =========================================================

-- V3 provisioned a collaborator identity for every new user.
-- From V4 onward the worker creates it only after explicit opt-in.
DROP TRIGGER IF EXISTS trg_users_create_collaborator;

-- Remove automatically provisioned identities that never participated.
-- Keep any collaborator with followers or payout history so a production
-- migration cannot erase an already established community relationship.
DELETE FROM collaborators
WHERE NOT EXISTS (
  SELECT 1
  FROM collaborator_supports s
  WHERE s.collaborator_user_id = collaborators.user_id
)
AND NOT EXISTS (
  SELECT 1
  FROM collaborator_monthly_rewards r
  WHERE r.user_id = collaborators.user_id
);

CREATE INDEX IF NOT EXISTS idx_collaborators_status_joined
ON collaborators(status,joined_at);
