-- +goose Up

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'handle'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users RENAME COLUMN handle TO username;
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rating integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

UPDATE users
SET display_name = username
WHERE display_name = '';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin', 'problem_setter', 'judge_admin'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

UPDATE users
SET password_hash = '$2b$10$kyWCGalLMjnAtOBogqzdPOyxl7gNpJYCa3gxcFQfqwu1vI67TO.ZS'
WHERE username = 'admin' AND password_hash = 'change-me';

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS created_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash text NOT NULL UNIQUE,
  user_agent text NOT NULL DEFAULT '',
  ip_address text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token_active ON sessions(session_token_hash)
WHERE revoked_at IS NULL;

ALTER TABLE contest_participants
  ADD COLUMN IF NOT EXISTS id bigint,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'registered';

CREATE SEQUENCE IF NOT EXISTS contest_participants_id_seq;
ALTER SEQUENCE contest_participants_id_seq OWNED BY contest_participants.id;
ALTER TABLE contest_participants
  ALTER COLUMN id SET DEFAULT nextval('contest_participants_id_seq');
UPDATE contest_participants
SET id = nextval('contest_participants_id_seq')
WHERE id IS NULL;
ALTER TABLE contest_participants
  ALTER COLUMN id SET NOT NULL;

ALTER TABLE contest_participants DROP CONSTRAINT IF EXISTS contest_participants_pkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'contest_participants'::regclass
      AND conname = 'contest_participants_pkey'
  ) THEN
    ALTER TABLE contest_participants
      ADD CONSTRAINT contest_participants_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'contest_participants'::regclass
      AND conname = 'contest_participants_contest_user_key'
  ) THEN
    ALTER TABLE contest_participants
      ADD CONSTRAINT contest_participants_contest_user_key UNIQUE (contest_id, user_id);
  END IF;
END $$;

ALTER TABLE contest_participants DROP CONSTRAINT IF EXISTS contest_participants_status_check;
ALTER TABLE contest_participants
  ADD CONSTRAINT contest_participants_status_check
  CHECK (status IN ('registered', 'cancelled', 'banned'));

CREATE INDEX IF NOT EXISTS idx_contest_participants_contest_status
  ON contest_participants(contest_id, status);
CREATE INDEX IF NOT EXISTS idx_contest_participants_user
  ON contest_participants(user_id);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  target_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target
  ON admin_audit_logs(target_user_id, created_at DESC);

-- +goose Down

DROP TABLE IF EXISTS admin_audit_logs;
DROP TABLE IF EXISTS sessions;
DROP INDEX IF EXISTS idx_contest_participants_user;
DROP INDEX IF EXISTS idx_contest_participants_contest_status;
ALTER TABLE contest_participants DROP CONSTRAINT IF EXISTS contest_participants_status_check;
ALTER TABLE contest_participants DROP CONSTRAINT IF EXISTS contest_participants_contest_user_key;
ALTER TABLE contest_participants DROP CONSTRAINT IF EXISTS contest_participants_pkey;
ALTER TABLE contest_participants DROP COLUMN IF EXISTS status;
ALTER TABLE contest_participants DROP COLUMN IF EXISTS id;
DROP SEQUENCE IF EXISTS contest_participants_id_seq;
ALTER TABLE problems DROP COLUMN IF EXISTS created_by_user_id;
DROP INDEX IF EXISTS idx_users_email_lower;
DROP INDEX IF EXISTS idx_users_username_lower;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
ALTER TABLE users DROP COLUMN IF EXISTS icon_url;
ALTER TABLE users DROP COLUMN IF EXISTS bio;
ALTER TABLE users DROP COLUMN IF EXISTS rating;
ALTER TABLE users DROP COLUMN IF EXISTS display_name;
