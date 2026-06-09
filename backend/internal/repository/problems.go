package repository

import "context"

func (s *Store) ListPublicProblems(ctx context.Context) ([]Problem, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id, title, slug, statement_markdown, constraints_text, input_format,
       output_format, time_limit_ms, memory_limit_kb, score, difficulty,
       is_public, created_at, updated_at, created_by_user_id
FROM problems
WHERE is_public = true
ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var problems []Problem
	for rows.Next() {
		problem, err := scanProblem(rows)
		if err != nil {
			return nil, err
		}
		problems = append(problems, problem)
	}
	return problems, rows.Err()
}

func (s *Store) ListAdminProblems(ctx context.Context) ([]AdminProblem, error) {
	rows, err := s.pool.Query(ctx, `
SELECT p.id, p.title, p.slug, p.problem_code, p.statement_markdown,
       p.constraints_text, p.input_format, p.output_format,
       p.time_limit_ms, p.memory_limit_kb, p.score, p.difficulty,
       p.tags, p.is_public, p.status, p.archived_at,
       COALESCE(tc.test_case_count, 0)::int,
       COALESCE(tc.sample_case_count, 0)::int,
       COALESCE(tc.hidden_case_count, 0)::int,
       p.created_at, p.updated_at, p.created_by_user_id
FROM problems p
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS test_case_count,
    COUNT(*) FILTER (WHERE is_sample = true) AS sample_case_count,
    COUNT(*) FILTER (WHERE is_hidden = true) AS hidden_case_count
  FROM test_cases
  WHERE problem_id = p.id
) tc ON true
ORDER BY p.id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var problems []AdminProblem
	for rows.Next() {
		problem, err := scanAdminProblem(rows)
		if err != nil {
			return nil, err
		}
		problems = append(problems, problem)
	}
	return problems, rows.Err()
}

func (s *Store) GetAdminProblemByID(ctx context.Context, id int64) (AdminProblem, error) {
	row := s.pool.QueryRow(ctx, `
SELECT p.id, p.title, p.slug, p.problem_code, p.statement_markdown,
       p.constraints_text, p.input_format, p.output_format,
       p.time_limit_ms, p.memory_limit_kb, p.score, p.difficulty,
       p.tags, p.is_public, p.status, p.archived_at,
       COALESCE(tc.test_case_count, 0)::int,
       COALESCE(tc.sample_case_count, 0)::int,
       COALESCE(tc.hidden_case_count, 0)::int,
       p.created_at, p.updated_at, p.created_by_user_id
FROM problems p
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS test_case_count,
    COUNT(*) FILTER (WHERE is_sample = true) AS sample_case_count,
    COUNT(*) FILTER (WHERE is_hidden = true) AS hidden_case_count
  FROM test_cases
  WHERE problem_id = p.id
) tc ON true
WHERE p.id = $1`, id)
	return scanAdminProblem(row)
}

func (s *Store) CreateAdminProblem(ctx context.Context, params AdminProblemParams) (AdminProblem, error) {
	var id int64
	err := s.pool.QueryRow(ctx, `
INSERT INTO problems (
  created_by_user_id, title, slug, problem_code, statement_markdown,
  constraints_text, input_format, output_format, time_limit_ms,
  memory_limit_kb, score, difficulty, tags, is_public, status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
RETURNING id`,
		nullInt64Value(params.CreatedByUserID),
		params.Title,
		params.Slug,
		params.ProblemCode,
		params.StatementMarkdown,
		params.ConstraintsText,
		params.InputFormat,
		params.OutputFormat,
		params.TimeLimitMS,
		params.MemoryLimitKB,
		params.Score,
		nullStringValue(params.Difficulty),
		params.Tags,
		params.IsPublic,
		params.Status,
	).Scan(&id)
	if err != nil {
		return AdminProblem{}, err
	}
	return s.GetAdminProblemByID(ctx, id)
}

func (s *Store) UpdateAdminProblem(ctx context.Context, id int64, params AdminProblemParams) (AdminProblem, error) {
	var updatedID int64
	err := s.pool.QueryRow(ctx, `
UPDATE problems
SET title = $2,
    slug = $3,
    problem_code = $4,
    statement_markdown = $5,
    constraints_text = $6,
    input_format = $7,
    output_format = $8,
    time_limit_ms = $9,
    memory_limit_kb = $10,
    score = $11,
    difficulty = $12,
    tags = $13,
    is_public = $14,
    status = $15,
    updated_at = now()
WHERE id = $1
RETURNING id`,
		id,
		params.Title,
		params.Slug,
		params.ProblemCode,
		params.StatementMarkdown,
		params.ConstraintsText,
		params.InputFormat,
		params.OutputFormat,
		params.TimeLimitMS,
		params.MemoryLimitKB,
		params.Score,
		nullStringValue(params.Difficulty),
		params.Tags,
		params.IsPublic,
		params.Status,
	).Scan(&updatedID)
	if err != nil {
		return AdminProblem{}, err
	}
	return s.GetAdminProblemByID(ctx, updatedID)
}

func (s *Store) UpdateAdminProblemStatus(ctx context.Context, id int64, status string, isPublic bool) (AdminProblem, error) {
	var updatedID int64
	err := s.pool.QueryRow(ctx, `
UPDATE problems
SET status = $2,
    is_public = $3,
    archived_at = CASE WHEN $2 = 'archived' THEN COALESCE(archived_at, now()) ELSE NULL END,
    updated_at = now()
WHERE id = $1
RETURNING id`, id, status, isPublic).Scan(&updatedID)
	if err != nil {
		return AdminProblem{}, err
	}
	return s.GetAdminProblemByID(ctx, updatedID)
}

func (s *Store) CopyAdminProblem(ctx context.Context, id int64, actorUserID int64, title, slug, problemCode string) (AdminProblem, error) {
	var newID int64
	err := s.pool.QueryRow(ctx, `
INSERT INTO problems (
  created_by_user_id, title, slug, problem_code, statement_markdown,
  constraints_text, input_format, output_format, time_limit_ms,
  memory_limit_kb, score, difficulty, tags, is_public, status
)
SELECT $2, $3, $4, $5, statement_markdown,
       constraints_text, input_format, output_format, time_limit_ms,
       memory_limit_kb, score, difficulty, tags, false, 'draft'
FROM problems
WHERE id = $1
RETURNING id`,
		id,
		actorUserID,
		title,
		slug,
		problemCode,
	).Scan(&newID)
	if err != nil {
		return AdminProblem{}, err
	}
	return s.GetAdminProblemByID(ctx, newID)
}

func (s *Store) ReplaceProblemTestCases(ctx context.Context, problemID int64, cases []AdminTestCaseParams) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM test_cases WHERE problem_id = $1`, problemID); err != nil {
		return err
	}

	for _, tc := range cases {
		if _, err := tx.Exec(ctx, `
INSERT INTO test_cases (
  problem_id, name, input_path, output_path, is_sample, is_hidden,
  score, group_name, order_index
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			problemID,
			tc.Name,
			tc.InputPath,
			tc.OutputPath,
			tc.IsSample,
			tc.IsHidden,
			tc.Score,
			nullStringValue(tc.GroupName),
			tc.OrderIndex,
		); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (s *Store) GetProblemBySlug(ctx context.Context, slug string) (Problem, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id, title, slug, statement_markdown, constraints_text, input_format,
       output_format, time_limit_ms, memory_limit_kb, score, difficulty,
       is_public, created_at, updated_at, created_by_user_id
FROM problems
WHERE slug = $1`, slug)
	return scanProblem(row)
}

func (s *Store) GetProblemByID(ctx context.Context, id int64) (Problem, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id, title, slug, statement_markdown, constraints_text, input_format,
       output_format, time_limit_ms, memory_limit_kb, score, difficulty,
       is_public, created_at, updated_at, created_by_user_id
FROM problems
WHERE id = $1`, id)
	return scanProblem(row)
}

func (s *Store) ListTestCasesByProblemID(ctx context.Context, problemID int64, includeHidden bool) ([]TestCase, error) {
	query := `
SELECT id, problem_id, name, input_path, output_path, is_sample, is_hidden,
       score, group_name, order_index, created_at, updated_at
FROM test_cases
WHERE problem_id = $1`
	args := []any{problemID}
	if !includeHidden {
		query += " AND is_hidden = false"
	}
	query += " ORDER BY order_index ASC, id ASC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cases []TestCase
	for rows.Next() {
		var tc TestCase
		if err := rows.Scan(
			&tc.ID,
			&tc.ProblemID,
			&tc.Name,
			&tc.InputPath,
			&tc.OutputPath,
			&tc.IsSample,
			&tc.IsHidden,
			&tc.Score,
			&tc.GroupName,
			&tc.OrderIndex,
			&tc.CreatedAt,
			&tc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		cases = append(cases, tc)
	}
	return cases, rows.Err()
}

type problemScanner interface {
	Scan(dest ...any) error
}

func scanAdminProblem(row problemScanner) (AdminProblem, error) {
	var problem AdminProblem
	err := row.Scan(
		&problem.ID,
		&problem.Title,
		&problem.Slug,
		&problem.ProblemCode,
		&problem.StatementMarkdown,
		&problem.ConstraintsText,
		&problem.InputFormat,
		&problem.OutputFormat,
		&problem.TimeLimitMS,
		&problem.MemoryLimitKB,
		&problem.Score,
		&problem.Difficulty,
		&problem.Tags,
		&problem.IsPublic,
		&problem.Status,
		&problem.ArchivedAt,
		&problem.TestCaseCount,
		&problem.SampleCaseCount,
		&problem.HiddenCaseCount,
		&problem.CreatedAt,
		&problem.UpdatedAt,
		&problem.CreatedByUserID,
	)
	return problem, err
}

func scanProblem(row problemScanner) (Problem, error) {
	var problem Problem
	err := row.Scan(
		&problem.ID,
		&problem.Title,
		&problem.Slug,
		&problem.StatementMarkdown,
		&problem.ConstraintsText,
		&problem.InputFormat,
		&problem.OutputFormat,
		&problem.TimeLimitMS,
		&problem.MemoryLimitKB,
		&problem.Score,
		&problem.Difficulty,
		&problem.IsPublic,
		&problem.CreatedAt,
		&problem.UpdatedAt,
		&problem.CreatedByUserID,
	)
	return problem, err
}
