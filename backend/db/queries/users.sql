-- name: GetUserByID :one
SELECT id, handle, email, password_hash, role, created_at, updated_at
FROM users
WHERE id = $1;

-- name: CreateUser :one
INSERT INTO users (handle, email, password_hash, role)
VALUES ($1, $2, $3, $4)
RETURNING id, handle, email, password_hash, role, created_at, updated_at;

