-- name: ListPublicProblems :many
SELECT id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
       score, difficulty, is_public, created_at, updated_at
FROM problems
WHERE is_public = true
ORDER BY id ASC;

-- name: GetProblemBySlug :one
SELECT id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
       score, difficulty, is_public, created_at, updated_at
FROM problems
WHERE slug = $1;

-- name: GetProblemByID :one
SELECT id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
       score, difficulty, is_public, created_at, updated_at
FROM problems
WHERE id = $1;

-- name: ListTestCasesByProblemID :many
SELECT id, problem_id, name, input_path, output_path, is_sample, is_hidden,
       score, group_name, order_index, created_at, updated_at
FROM test_cases
WHERE problem_id = $1
ORDER BY order_index ASC, id ASC;
