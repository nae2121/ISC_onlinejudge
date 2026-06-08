-- +goose Up

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS problem_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS constraints_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS input_format text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS output_format text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE problems
SET status = CASE WHEN is_public THEN 'public' ELSE 'private' END
WHERE status = 'draft';

ALTER TABLE problems DROP CONSTRAINT IF EXISTS problems_status_check;
ALTER TABLE problems
  ADD CONSTRAINT problems_status_check
  CHECK (status IN ('draft', 'private', 'public', 'archived'));

CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status, id);

-- +goose Down

DROP INDEX IF EXISTS idx_problems_status;
ALTER TABLE problems DROP CONSTRAINT IF EXISTS problems_status_check;
ALTER TABLE problems
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS output_format,
  DROP COLUMN IF EXISTS input_format,
  DROP COLUMN IF EXISTS constraints_text,
  DROP COLUMN IF EXISTS problem_code;
