-- name: ListPublicProblems :many
SELECT id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
       score, difficulty, is_public, created_at, updated_at, created_by_user_id
FROM problems
WHERE is_public = true
ORDER BY id ASC;

-- name: ListAllProblems :many
SELECT id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
       score, difficulty, is_public, created_at, updated_at, created_by_user_id
FROM problems
ORDER BY id ASC
LIMIT $1 OFFSET $2;

-- name: GetProblemBySlug :one
SELECT id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
       score, difficulty, is_public, created_at, updated_at, created_by_user_id
FROM problems
WHERE slug = $1;

-- name: GetProblemByID :one
SELECT id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
       score, difficulty, is_public, created_at, updated_at, created_by_user_id
FROM problems
WHERE id = $1;

-- name: CreateProblem :one
INSERT INTO problems (
  created_by_user_id, title, slug, statement_markdown, time_limit_ms,
  memory_limit_kb, score, difficulty, is_public
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
          score, difficulty, is_public, created_at, updated_at, created_by_user_id;

-- name: UpdateProblem :one
UPDATE problems
SET title = $2,
    statement_markdown = $3,
    time_limit_ms = $4,
    memory_limit_kb = $5,
    score = $6,
    difficulty = $7,
    is_public = $8,
    updated_at = now()
WHERE id = $1
RETURNING id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
          score, difficulty, is_public, created_at, updated_at, created_by_user_id;
