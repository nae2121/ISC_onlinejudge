package queue

import (
	"context"
	"database/sql"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Job struct {
	ID           int64
	SubmissionID int64
	Status       string
	Priority     int
	Attempts     int
	LockedBy     sql.NullString
	LockedAt     sql.NullTime
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type PostgresQueue struct {
	pool *pgxpool.Pool
}

func NewPostgresQueue(pool *pgxpool.Pool) *PostgresQueue {
	return &PostgresQueue{pool: pool}
}

func (q *PostgresQueue) ClaimNext(ctx context.Context, workerID string) (*Job, error) {
	tx, err := q.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var job Job
	err = tx.QueryRow(ctx, `
SELECT id, submission_id, status, priority, attempts, locked_by, locked_at, created_at, updated_at
FROM judge_jobs
WHERE status = 'queued'
ORDER BY priority DESC, created_at ASC
FOR UPDATE SKIP LOCKED
LIMIT 1`).Scan(
		&job.ID,
		&job.SubmissionID,
		&job.Status,
		&job.Priority,
		&job.Attempts,
		&job.LockedBy,
		&job.LockedAt,
		&job.CreatedAt,
		&job.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	err = tx.QueryRow(ctx, `
UPDATE judge_jobs
SET status = 'running',
    attempts = attempts + 1,
    locked_by = $2,
    locked_at = now(),
    updated_at = now()
WHERE id = $1
RETURNING id, submission_id, status, priority, attempts, locked_by, locked_at, created_at, updated_at`,
		job.ID,
		workerID,
	).Scan(
		&job.ID,
		&job.SubmissionID,
		&job.Status,
		&job.Priority,
		&job.Attempts,
		&job.LockedBy,
		&job.LockedAt,
		&job.CreatedAt,
		&job.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &job, nil
}

func (q *PostgresQueue) Complete(ctx context.Context, jobID int64) error {
	_, err := q.pool.Exec(ctx, `
UPDATE judge_jobs
SET status = 'completed',
    locked_by = NULL,
    locked_at = NULL,
    updated_at = now()
WHERE id = $1`, jobID)
	return err
}

func (q *PostgresQueue) Fail(ctx context.Context, jobID int64) error {
	_, err := q.pool.Exec(ctx, `
UPDATE judge_jobs
SET status = 'failed',
    locked_by = NULL,
    locked_at = NULL,
    updated_at = now()
WHERE id = $1`, jobID)
	return err
}

func (q *PostgresQueue) RequeueStale(ctx context.Context, staleAfter time.Duration) (int64, error) {
	tag, err := q.pool.Exec(ctx, `
UPDATE judge_jobs
SET status = 'queued',
    locked_by = NULL,
    locked_at = NULL,
    updated_at = now()
WHERE status = 'running'
  AND locked_at < now() - ($1::double precision * interval '1 second')`, staleAfter.Seconds())
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
