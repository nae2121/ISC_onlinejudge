-- name: CreateTestCase :one
INSERT INTO test_cases (
  problem_id, name, input_path, output_path, is_sample, is_hidden,
  score, group_name, order_index
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, problem_id, name, input_path, output_path, is_sample, is_hidden,
          score, group_name, order_index, created_at, updated_at;

-- name: ListTestCasesByProblemID :many
SELECT id, problem_id, name, input_path, output_path, is_sample, is_hidden,
       score, group_name, order_index, created_at, updated_at
FROM test_cases
WHERE problem_id = $1
ORDER BY order_index ASC, id ASC;

-- name: ListVisibleTestCasesByProblemID :many
SELECT id, problem_id, name, input_path, output_path, is_sample, is_hidden,
       score, group_name, order_index, created_at, updated_at
FROM test_cases
WHERE problem_id = $1
  AND is_hidden = false
ORDER BY order_index ASC, id ASC;

-- name: ListSampleTestCasesByProblemID :many
SELECT id, problem_id, name, input_path, output_path, is_sample, is_hidden,
       score, group_name, order_index, created_at, updated_at
FROM test_cases
WHERE problem_id = $1
  AND is_sample = true
ORDER BY order_index ASC, id ASC;

-- name: ListAllTestCasesByProblemID :many
SELECT id, problem_id, name, input_path, output_path, is_sample, is_hidden,
       score, group_name, order_index, created_at, updated_at
FROM test_cases
WHERE problem_id = $1
ORDER BY order_index ASC, id ASC;

-- name: DeleteTestCase :exec
DELETE FROM test_cases
WHERE id = $1;
