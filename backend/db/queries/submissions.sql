-- name: CreateSubmission :one
INSERT INTO submissions (user_id, problem_id, language_id, source_code, status)
VALUES ($1, $2, $3, $4, 'WJ')
RETURNING id, user_id, problem_id, language_id, source_code, status, score,
          max_time_ms, max_memory_kb, submitted_at, judged_at;

-- name: GetSubmissionByID :one
SELECT id, user_id, problem_id, language_id, source_code, status, score,
       max_time_ms, max_memory_kb, submitted_at, judged_at
FROM submissions
WHERE id = $1;

-- name: ListSubmissionsByUsername :many
SELECT s.id, s.user_id, s.problem_id, s.language_id, s.source_code, s.status,
       s.score, s.max_time_ms, s.max_memory_kb, s.submitted_at, s.judged_at
FROM submissions s
JOIN users u ON u.id = s.user_id
WHERE lower(u.username) = lower($1)
ORDER BY s.submitted_at DESC, s.id DESC
LIMIT $2;

-- name: UpdateSubmissionFinal :exec
UPDATE submissions
SET status = $2,
    score = $3,
    max_time_ms = $4,
    max_memory_kb = $5,
    judged_at = now()
WHERE id = $1;

-- name: DeleteSubmissionResults :exec
DELETE FROM submission_results
WHERE submission_id = $1;

-- name: InsertSubmissionResult :one
INSERT INTO submission_results (
  submission_id, test_case_id, status, execution_time_ms, memory_kb,
  stdout_path, stderr_path, error_message
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, submission_id, test_case_id, status, execution_time_ms, memory_kb,
          stdout_path, stderr_path, error_message, created_at;

-- name: ListSubmissionResults :many
SELECT id, submission_id, test_case_id, status, execution_time_ms, memory_kb,
       stdout_path, stderr_path, error_message, created_at
FROM submission_results
WHERE submission_id = $1
ORDER BY id ASC;
