-- name: CreateJudgeJob :one
INSERT INTO judge_jobs (submission_id, status, priority)
VALUES ($1, 'queued', $2)
RETURNING id, submission_id, status, priority, attempts, locked_by, locked_at, created_at, updated_at;

-- name: ClaimNextJudgeJob :one
SELECT id, submission_id, status, priority, attempts, locked_by, locked_at, created_at, updated_at
FROM judge_jobs
WHERE status = 'queued'
ORDER BY priority DESC, created_at ASC
FOR UPDATE SKIP LOCKED
LIMIT 1;

-- name: CompleteJudgeJob :exec
UPDATE judge_jobs
SET status = 'completed', locked_by = NULL, locked_at = NULL, updated_at = now()
WHERE id = $1;

-- name: FailJudgeJob :exec
UPDATE judge_jobs
SET status = 'failed', locked_by = NULL, locked_at = NULL, updated_at = now()
WHERE id = $1;

-- name: RequeueStaleJudgeJobs :execrows
UPDATE judge_jobs
SET status = 'queued',
    locked_by = NULL,
    locked_at = NULL,
    updated_at = now()
WHERE status = 'running'
  AND locked_at < now() - ($1::double precision * interval '1 second');
