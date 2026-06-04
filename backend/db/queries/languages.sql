-- name: ListActiveLanguages :many
SELECT id, name, version, source_file_name, compile_command, run_command,
       time_limit_multiplier, memory_limit_multiplier, is_active, created_at, updated_at
FROM languages
WHERE is_active = true
ORDER BY id ASC;

-- name: GetLanguageByID :one
SELECT id, name, version, source_file_name, compile_command, run_command,
       time_limit_multiplier, memory_limit_multiplier, is_active, created_at, updated_at
FROM languages
WHERE id = $1;
