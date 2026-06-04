package repository

import "context"

func (s *Store) ListActiveLanguages(ctx context.Context) ([]Language, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id, name, version, source_file_name, compile_command, run_command,
       time_limit_multiplier, memory_limit_multiplier, is_active, created_at, updated_at
FROM languages
WHERE is_active = true
ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var languages []Language
	for rows.Next() {
		lang, err := scanLanguage(rows)
		if err != nil {
			return nil, err
		}
		languages = append(languages, lang)
	}
	return languages, rows.Err()
}

func (s *Store) GetLanguageByID(ctx context.Context, id int64) (Language, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id, name, version, source_file_name, compile_command, run_command,
       time_limit_multiplier, memory_limit_multiplier, is_active, created_at, updated_at
FROM languages
WHERE id = $1`, id)
	return scanLanguage(row)
}

type languageScanner interface {
	Scan(dest ...any) error
}

func scanLanguage(row languageScanner) (Language, error) {
	var lang Language
	err := row.Scan(
		&lang.ID,
		&lang.Name,
		&lang.Version,
		&lang.SourceFileName,
		&lang.CompileCommand,
		&lang.RunCommand,
		&lang.TimeLimitMultiplier,
		&lang.MemoryLimitMultiplier,
		&lang.IsActive,
		&lang.CreatedAt,
		&lang.UpdatedAt,
	)
	return lang, err
}
