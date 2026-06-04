-- +goose Up

CREATE TABLE users (
  id bigserial PRIMARY KEY,
  handle text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE problems (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  statement_markdown text NOT NULL DEFAULT '',
  time_limit_ms integer NOT NULL DEFAULT 2000 CHECK (time_limit_ms > 0),
  memory_limit_kb integer NOT NULL DEFAULT 256000 CHECK (memory_limit_kb > 0),
  score integer NOT NULL DEFAULT 100 CHECK (score >= 0),
  difficulty text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE test_cases (
  id bigserial PRIMARY KEY,
  problem_id bigint NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  name text NOT NULL,
  input_path text NOT NULL,
  output_path text NOT NULL,
  is_sample boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT true,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  group_name text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, name),
  UNIQUE (problem_id, order_index)
);

CREATE TABLE languages (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  version text NOT NULL DEFAULT '',
  source_file_name text NOT NULL,
  compile_command text,
  run_command text NOT NULL,
  time_limit_multiplier double precision NOT NULL DEFAULT 1.0 CHECK (time_limit_multiplier > 0),
  memory_limit_multiplier double precision NOT NULL DEFAULT 1.0 CHECK (memory_limit_multiplier > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE submissions (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  problem_id bigint NOT NULL REFERENCES problems(id),
  language_id bigint NOT NULL REFERENCES languages(id),
  source_code text NOT NULL,
  status text NOT NULL DEFAULT 'WJ' CHECK (status IN ('WJ', 'AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'OLE', 'IE')),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  max_time_ms integer NOT NULL DEFAULT 0 CHECK (max_time_ms >= 0),
  max_memory_kb integer NOT NULL DEFAULT 0 CHECK (max_memory_kb >= 0),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  judged_at timestamptz
);

CREATE TABLE submission_results (
  id bigserial PRIMARY KEY,
  submission_id bigint NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_id bigint REFERENCES test_cases(id),
  status text NOT NULL CHECK (status IN ('WJ', 'AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'OLE', 'IE')),
  execution_time_ms integer NOT NULL DEFAULT 0 CHECK (execution_time_ms >= 0),
  memory_kb integer NOT NULL DEFAULT 0 CHECK (memory_kb >= 0),
  stdout_path text,
  stderr_path text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE judge_jobs (
  id bigserial PRIMARY KEY,
  submission_id bigint NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  priority integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  locked_by text,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contests (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE TABLE contest_problems (
  contest_id bigint NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  problem_id bigint NOT NULL REFERENCES problems(id),
  alias text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 100 CHECK (score >= 0),
  PRIMARY KEY (contest_id, problem_id),
  UNIQUE (contest_id, alias),
  UNIQUE (contest_id, order_index)
);

CREATE TABLE contest_participants (
  contest_id bigint NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contest_id, user_id)
);

CREATE INDEX idx_problems_public ON problems(is_public, id);
CREATE INDEX idx_test_cases_problem_order ON test_cases(problem_id, order_index);
CREATE INDEX idx_submissions_user_problem ON submissions(user_id, problem_id);
CREATE INDEX idx_submissions_problem_submitted ON submissions(problem_id, submitted_at DESC);
CREATE INDEX idx_submission_results_submission ON submission_results(submission_id);
CREATE UNIQUE INDEX idx_submission_results_case_unique
ON submission_results(submission_id, test_case_id)
WHERE test_case_id IS NOT NULL;
CREATE INDEX idx_judge_jobs_pickup ON judge_jobs(status, priority DESC, created_at ASC);
CREATE INDEX idx_judge_jobs_locked_at ON judge_jobs(status, locked_at);

INSERT INTO users (handle, email, password_hash, role)
VALUES ('admin', 'admin@example.com', 'change-me', 'admin')
ON CONFLICT (handle) DO NOTHING;

INSERT INTO languages (id, name, version, source_file_name, compile_command, run_command)
VALUES
  (71, 'Python', '3', 'main.py', NULL, 'python3 main.py'),
  (54, 'C++', '17', 'main.cpp', 'g++ -std=c++17 -O2 -pipe -static -s main.cpp -o main', './main'),
  (63, 'JavaScript', 'Node.js', 'main.js', NULL, 'node main.js')
ON CONFLICT (id) DO NOTHING;

SELECT setval('languages_id_seq', COALESCE((SELECT MAX(id) FROM languages), 1), true);

INSERT INTO problems (
  title, slug, statement_markdown, time_limit_ms, memory_limit_kb,
  score, difficulty, is_public
)
VALUES (
  'ABC001 A - Difference',
  'abc001_a',
  '# ABC001 A - Difference

Given two integers H1 and H2, print H1 - H2.',
  2000,
  256000,
  100,
  'beginner',
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO test_cases (
  problem_id, name, input_path, output_path, is_sample, is_hidden,
  score, group_name, order_index
)
SELECT id, 'sample_01',
       'problems/abc001_a/samples/sample_01.in',
       'problems/abc001_a/samples/sample_01.out',
       true, false, 0, 'samples', 1
FROM problems
WHERE slug = 'abc001_a'
ON CONFLICT (problem_id, name) DO NOTHING;

INSERT INTO test_cases (
  problem_id, name, input_path, output_path, is_sample, is_hidden,
  score, group_name, order_index
)
SELECT id, 'secret_01',
       'problems/abc001_a/tests/01.in',
       'problems/abc001_a/tests/01.out',
       false, true, 100, 'all', 2
FROM problems
WHERE slug = 'abc001_a'
ON CONFLICT (problem_id, name) DO NOTHING;

-- +goose Down

DROP TABLE IF EXISTS contest_participants;
DROP TABLE IF EXISTS contest_problems;
DROP TABLE IF EXISTS contests;
DROP TABLE IF EXISTS judge_jobs;
DROP TABLE IF EXISTS submission_results;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS languages;
DROP TABLE IF EXISTS test_cases;
DROP TABLE IF EXISTS problems;
DROP TABLE IF EXISTS users;
