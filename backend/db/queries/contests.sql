-- name: ListPublicContests :many
SELECT id, title, slug, start_at, end_at, is_public, created_at, updated_at
FROM contests
WHERE is_public = true
ORDER BY start_at DESC, id DESC;

-- name: GetContestBySlug :one
SELECT id, title, slug, start_at, end_at, is_public, created_at, updated_at
FROM contests
WHERE slug = $1;

-- name: ListContestProblems :many
SELECT contest_id, problem_id, alias, order_index, score
FROM contest_problems
WHERE contest_id = $1
ORDER BY order_index ASC;

