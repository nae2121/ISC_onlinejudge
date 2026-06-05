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

-- name: GetUserByEmail :one
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE lower(email) = lower($1);

-- name: GetUserByLogin :one
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE lower(username) = lower($1) OR lower(email) = lower($1)
LIMIT 1;

-- name: ListUsers :many
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
ORDER BY created_at DESC, id DESC
LIMIT $1 OFFSET $2;

-- name: CreateUser :one
INSERT INTO users (username, display_name, email, password_hash, role)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, username, display_name, email, password_hash, role, rating, bio,
          icon_url, is_active, email_verified_at, created_at, updated_at;

-- name: UpdateUserProfile :one
UPDATE users
SET display_name = $2,
    bio = $3,
    icon_url = $4,
    updated_at = now()
WHERE id = $1
RETURNING id, username, display_name, email, password_hash, role, rating, bio,
          icon_url, is_active, email_verified_at, created_at, updated_at;

-- name: UpdateUserPassword :exec
UPDATE users
SET password_hash = $2,
    updated_at = now()
WHERE id = $1;

-- name: UpdateUserRole :one
UPDATE users
SET role = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, username, display_name, email, password_hash, role, rating, bio,
          icon_url, is_active, email_verified_at, created_at, updated_at;

-- name: SetUserActive :one
UPDATE users
SET is_active = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, username, display_name, email, password_hash, role, rating, bio,
          icon_url, is_active, email_verified_at, created_at, updated_at;
