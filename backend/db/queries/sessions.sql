-- name: CreateSession :one
INSERT INTO sessions (user_id, session_token_hash, user_agent, ip_address, expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, session_token_hash, user_agent, ip_address,
          expires_at, created_at, revoked_at;

-- name: GetSessionByTokenHash :one
SELECT id, user_id, session_token_hash, user_agent, ip_address,
       expires_at, created_at, revoked_at
FROM sessions
WHERE session_token_hash = $1
  AND revoked_at IS NULL
  AND expires_at > now();

-- name: GetUserBySessionTokenHash :one
SELECT
  u.id, u.username, u.display_name, u.email, u.password_hash, u.role,
  u.rating, u.bio, u.icon_url, u.is_active, u.email_verified_at,
  u.created_at, u.updated_at,
  s.id, s.user_id, s.session_token_hash, s.user_agent, s.ip_address,
  s.expires_at, s.created_at, s.revoked_at
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.session_token_hash = $1
  AND s.revoked_at IS NULL
  AND s.expires_at > now()
  AND u.is_active = true;

-- name: RevokeSessionByTokenHash :exec
UPDATE sessions
SET revoked_at = COALESCE(revoked_at, now())
WHERE session_token_hash = $1;

-- name: RevokeAllUserSessions :exec
UPDATE sessions
SET revoked_at = COALESCE(revoked_at, now())
WHERE user_id = $1
  AND revoked_at IS NULL;

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions
WHERE expires_at <= now();
