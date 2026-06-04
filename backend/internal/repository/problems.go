package repository

import "context"

func (s *Store) ListPublicProblems(ctx context.Context) ([]Problem, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
       score, difficulty, is_public, created_at, updated_at, created_by_user_id
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

func (s *Store) GetProblemBySlug(ctx context.Context, slug string) (Problem, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
       score, difficulty, is_public, created_at, updated_at, created_by_user_id
FROM problems
WHERE slug = $1`, slug)
	return scanProblem(row)
}

func (s *Store) GetProblemByID(ctx context.Context, id int64) (Problem, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id, title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
       score, difficulty, is_public, created_at, updated_at, created_by_user_id
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

func scanProblem(row problemScanner) (Problem, error) {
	var problem Problem
	err := row.Scan(
		&problem.ID,
		&problem.Title,
		&problem.Slug,
		&problem.StatementMarkdown,
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
