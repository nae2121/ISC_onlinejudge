-- name: GetUserByID :one
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE id = $1;

-- name: GetUserByUsername :one
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE lower(username) = lower($1);

-- name: GetUserByLogin :one
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE lower(username) = lower($1) OR lower(email) = lower($1)
LIMIT 1;

-- name: CreateUser :one
INSERT INTO users (username, display_name, email, password_hash, role)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, username, display_name, email, password_hash, role, rating, bio,
          icon_url, is_active, email_verified_at, created_at, updated_at;

-- name: CreateSession :one
INSERT INTO sessions (user_id, session_token_hash, user_agent, ip_address, expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, session_token_hash, user_agent, ip_address, expires_at, created_at, revoked_at;

-- name: RevokeSessionByTokenHash :exec
UPDATE sessions
SET revoked_at = COALESCE(revoked_at, now())
WHERE session_token_hash = $1;
