package repository

import (
	"context"
	"database/sql"
	"time"
)

func (s *Store) CreateSubmissionWithJob(ctx context.Context, params CreateSubmissionParams) (Submission, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Submission{}, err
	}
	defer tx.Rollback(ctx)

	var submission Submission
	err = tx.QueryRow(ctx, `
INSERT INTO submissions (user_id, problem_id, language_id, source_code, status)
VALUES ($1, $2, $3, $4, 'WJ')
RETURNING id, user_id, problem_id, language_id, source_code, status, score,
          max_time_ms, max_memory_kb, submitted_at, judged_at`,
		params.UserID,
		params.ProblemID,
		params.LanguageID,
		params.SourceCode,
	).Scan(
		&submission.ID,
		&submission.UserID,
		&submission.ProblemID,
		&submission.LanguageID,
		&submission.SourceCode,
		&submission.Status,
		&submission.Score,
		&submission.MaxTimeMS,
		&submission.MaxMemoryKB,
		&submission.SubmittedAt,
		&submission.JudgedAt,
	)
	if err != nil {
		return Submission{}, err
	}

	_, err = tx.Exec(ctx, `
INSERT INTO judge_jobs (submission_id, status, priority)
VALUES ($1, 'queued', $2)`,
		submission.ID,
		params.Priority,
	)
	if err != nil {
		return Submission{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Submission{}, err
	}
	return submission, nil
}

func (s *Store) GetSubmissionByID(ctx context.Context, id int64) (Submission, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id, user_id, problem_id, language_id, source_code, status, score,
       max_time_ms, max_memory_kb, submitted_at, judged_at
FROM submissions
WHERE id = $1`, id)
	return scanSubmission(row)
}

func (s *Store) UpdateSubmissionRunning(ctx context.Context, id int64) error {
	_, err := s.pool.Exec(ctx, `
UPDATE submissions
SET status = 'WJ', judged_at = NULL
WHERE id = $1`, id)
	return err
}

func (s *Store) UpdateSubmissionFinal(ctx context.Context, id int64, status string, score, maxTimeMS, maxMemoryKB int) error {
	_, err := s.pool.Exec(ctx, `
UPDATE submissions
SET status = $2,
    score = $3,
    max_time_ms = $4,
    max_memory_kb = $5,
    judged_at = $6
WHERE id = $1`,
		id,
		status,
		score,
		maxTimeMS,
		maxMemoryKB,
		time.Now().UTC(),
	)
	return err
}

func (s *Store) DeleteSubmissionResults(ctx context.Context, submissionID int64) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM submission_results WHERE submission_id = $1`, submissionID)
	return err
}

func (s *Store) InsertSubmissionResult(ctx context.Context, params InsertResultParams) (SubmissionResult, error) {
	row := s.pool.QueryRow(ctx, `
INSERT INTO submission_results (
  submission_id, test_case_id, status, execution_time_ms, memory_kb,
  stdout_path, stderr_path, error_message
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, submission_id, test_case_id, status, execution_time_ms, memory_kb,
          stdout_path, stderr_path, error_message, created_at`,
		params.SubmissionID,
		nullInt64Value(params.TestCaseID),
		params.Status,
		params.ExecutionTimeMS,
		params.MemoryKB,
		nullStringValue(params.StdoutPath),
		nullStringValue(params.StderrPath),
		nullStringValue(params.ErrorMessage),
	)
	return scanSubmissionResult(row)
}

func (s *Store) ListSubmissionResults(ctx context.Context, submissionID int64) ([]SubmissionResult, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id, submission_id, test_case_id, status, execution_time_ms, memory_kb,
       stdout_path, stderr_path, error_message, created_at
FROM submission_results
WHERE submission_id = $1
ORDER BY id ASC`, submissionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SubmissionResult
	for rows.Next() {
		result, err := scanSubmissionResult(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, rows.Err()
}

type submissionScanner interface {
	Scan(dest ...any) error
}

func scanSubmission(row submissionScanner) (Submission, error) {
	var submission Submission
	err := row.Scan(
		&submission.ID,
		&submission.UserID,
		&submission.ProblemID,
		&submission.LanguageID,
		&submission.SourceCode,
		&submission.Status,
		&submission.Score,
		&submission.MaxTimeMS,
		&submission.MaxMemoryKB,
		&submission.SubmittedAt,
		&submission.JudgedAt,
	)
	return submission, err
}

func scanSubmissionResult(row submissionScanner) (SubmissionResult, error) {
	var result SubmissionResult
	err := row.Scan(
		&result.ID,
		&result.SubmissionID,
		&result.TestCaseID,
		&result.Status,
		&result.ExecutionTimeMS,
		&result.MemoryKB,
		&result.StdoutPath,
		&result.StderrPath,
		&result.ErrorMessage,
		&result.CreatedAt,
	)
	return result, err
}

func nullStringValue(value sql.NullString) any {
	if !value.Valid {
		return nil
	}
	return value.String
}

func nullInt64Value(value sql.NullInt64) any {
	if !value.Valid {
		return nil
	}
	return value.Int64
}
