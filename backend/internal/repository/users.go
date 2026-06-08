package repository

import (
	"context"
	"database/sql"

	"github.com/jackc/pgx/v5/pgconn"
)

func (s *Store) CreateUser(ctx context.Context, params CreateUserParams) (User, error) {
	row := s.pool.QueryRow(ctx, `
INSERT INTO users (username, display_name, email, password_hash, role, is_active)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, username, display_name, email, password_hash, role, rating, bio,
          icon_url, is_active, email_verified_at, created_at, updated_at`,
		params.Username,
		params.DisplayName,
		params.Email,
		params.PasswordHash,
		params.Role,
		params.IsActive,
	)
	return scanUser(row)
}

func (s *Store) GetUserByID(ctx context.Context, id int64) (User, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE id = $1`, id)
	return scanUser(row)
}

func (s *Store) GetUserByUsername(ctx context.Context, username string) (User, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE lower(username) = lower($1)`, username)
	return scanUser(row)
}

func (s *Store) GetUserByLogin(ctx context.Context, identity string) (User, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE lower(username) = lower($1) OR lower(email) = lower($1)
ORDER BY id ASC
LIMIT 1`, identity)
	return scanUser(row)
}

func (s *Store) GetUserStats(ctx context.Context, userID int64) (UserStats, error) {
	row := s.pool.QueryRow(ctx, `
WITH solved AS (
  SELECT DISTINCT s.problem_id, p.score
  FROM submissions s
  JOIN problems p ON p.id = s.problem_id
  WHERE s.user_id = $1
    AND s.status = 'AC'
    AND p.is_public = true
)
SELECT
  COALESCE((SELECT COUNT(*) FROM solved), 0)::int AS solved_count,
  COALESCE((SELECT SUM(score) FROM solved), 0)::int AS points,
  COALESCE((SELECT COUNT(*) FROM submissions WHERE user_id = $1), 0)::int AS submissions_count`,
		userID,
	)

	var stats UserStats
	err := row.Scan(&stats.SolvedCount, &stats.Points, &stats.SubmissionsCount)
	return stats, err
}

func (s *Store) ListUsers(ctx context.Context, params ListUsersParams) ([]User, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
ORDER BY id ASC
LIMIT $1 OFFSET $2`,
		params.Limit,
		params.Offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s *Store) UpdateUserProfile(ctx context.Context, params UpdateUserProfileParams) (User, error) {
	row := s.pool.QueryRow(ctx, `
UPDATE users
SET display_name = $2,
    bio = $3,
    icon_url = $4,
    updated_at = now()
WHERE id = $1
RETURNING id, username, display_name, email, password_hash, role, rating, bio,
          icon_url, is_active, email_verified_at, created_at, updated_at`,
		params.UserID,
		params.DisplayName,
		params.Bio,
		nullStringValue(params.IconURL),
	)
	return scanUser(row)
}

func (s *Store) UpdateUserPasswordHash(ctx context.Context, userID int64, passwordHash string) error {
	_, err := s.pool.Exec(ctx, `
UPDATE users
SET password_hash = $2,
    updated_at = now()
WHERE id = $1`, userID, passwordHash)
	return err
}

func (s *Store) UpdateUserRoleWithAudit(ctx context.Context, actorUserID, targetUserID int64, role string) (User, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)

	current, err := scanUser(tx.QueryRow(ctx, `
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE id = $1
FOR UPDATE`, targetUserID))
	if err != nil {
		return User{}, err
	}

	updated, err := scanUser(tx.QueryRow(ctx, `
UPDATE users
SET role = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, username, display_name, email, password_hash, role, rating, bio,
          icon_url, is_active, email_verified_at, created_at, updated_at`,
		targetUserID,
		role,
	))
	if err != nil {
		return User{}, err
	}

	if err := insertAdminAuditLog(ctx, tx, AdminAuditLogParams{
		ActorUserID:  actorUserID,
		TargetUserID: targetUserID,
		Action:       "user.role.update",
		OldValue:     sql.NullString{String: current.Role, Valid: true},
		NewValue:     sql.NullString{String: role, Valid: true},
	}); err != nil {
		return User{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, err
	}
	return updated, nil
}

func (s *Store) UpdateUserActiveWithAudit(ctx context.Context, actorUserID, targetUserID int64, isActive bool) (User, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)

	current, err := scanUser(tx.QueryRow(ctx, `
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE id = $1
FOR UPDATE`, targetUserID))
	if err != nil {
		return User{}, err
	}

	updated, err := scanUser(tx.QueryRow(ctx, `
UPDATE users
SET is_active = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, username, display_name, email, password_hash, role, rating, bio,
          icon_url, is_active, email_verified_at, created_at, updated_at`,
		targetUserID,
		isActive,
	))
	if err != nil {
		return User{}, err
	}

	if !isActive {
		if _, err := tx.Exec(ctx, `
UPDATE sessions
SET revoked_at = COALESCE(revoked_at, now())
WHERE user_id = $1`, targetUserID); err != nil {
			return User{}, err
		}
	}

	if err := insertAdminAuditLog(ctx, tx, AdminAuditLogParams{
		ActorUserID:  actorUserID,
		TargetUserID: targetUserID,
		Action:       "user.active.update",
		OldValue:     boolNullString(current.IsActive),
		NewValue:     boolNullString(isActive),
	}); err != nil {
		return User{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, err
	}
	return updated, nil
}

func (s *Store) SoftDeleteUserWithAudit(ctx context.Context, actorUserID, targetUserID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	current, err := scanUser(tx.QueryRow(ctx, `
SELECT id, username, display_name, email, password_hash, role, rating, bio,
       icon_url, is_active, email_verified_at, created_at, updated_at
FROM users
WHERE id = $1
FOR UPDATE`, targetUserID))
	if err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
UPDATE users
SET is_active = false,
    updated_at = now()
WHERE id = $1`, targetUserID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
UPDATE sessions
SET revoked_at = COALESCE(revoked_at, now())
WHERE user_id = $1`, targetUserID); err != nil {
		return err
	}
	if err := insertAdminAuditLog(ctx, tx, AdminAuditLogParams{
		ActorUserID:  actorUserID,
		TargetUserID: targetUserID,
		Action:       "user.delete",
		OldValue:     boolNullString(current.IsActive),
		NewValue:     sql.NullString{String: "false", Valid: true},
	}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *Store) CreateSession(ctx context.Context, params CreateSessionParams) (Session, error) {
	row := s.pool.QueryRow(ctx, `
INSERT INTO sessions (user_id, session_token_hash, user_agent, ip_address, expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, session_token_hash, user_agent, ip_address,
          expires_at, created_at, revoked_at`,
		params.UserID,
		params.SessionTokenHash,
		params.UserAgent,
		params.IPAddress,
		params.ExpiresAt,
	)
	return scanSession(row)
}

func (s *Store) GetUserBySessionTokenHash(ctx context.Context, tokenHash string) (User, Session, error) {
	row := s.pool.QueryRow(ctx, `
SELECT
  u.id, u.username, u.display_name, u.email, u.password_hash, u.role,
  u.rating, u.bio, u.icon_url, u.is_active, u.email_verified_at,
  u.created_at, u.updated_at,
  s.id, s.user_id, s.session_token_hash, s.user_agent, s.ip_address,
  s.expires_at, s.created_at, s.revoked_at
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.session_token_hash = $1
  AND s.revoked_at IS NULL
  AND s.expires_at > now()
  AND u.is_active = true`, tokenHash)

	var user User
	var session Session
	err := row.Scan(
		&user.ID,
		&user.Username,
		&user.DisplayName,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.Rating,
		&user.Bio,
		&user.IconURL,
		&user.IsActive,
		&user.EmailVerifiedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&session.ID,
		&session.UserID,
		&session.SessionTokenHash,
		&session.UserAgent,
		&session.IPAddress,
		&session.ExpiresAt,
		&session.CreatedAt,
		&session.RevokedAt,
	)
	return user, session, err
}

func (s *Store) RevokeSessionByTokenHash(ctx context.Context, tokenHash string) error {
	_, err := s.pool.Exec(ctx, `
UPDATE sessions
SET revoked_at = COALESCE(revoked_at, now())
WHERE session_token_hash = $1`, tokenHash)
	return err
}

func (s *Store) RevokeSessionsByUserID(ctx context.Context, userID int64) error {
	_, err := s.pool.Exec(ctx, `
UPDATE sessions
SET revoked_at = COALESCE(revoked_at, now())
WHERE user_id = $1`, userID)
	return err
}

func (s *Store) ListSubmissionsByUsername(ctx context.Context, username string, limit int) ([]Submission, error) {
	rows, err := s.pool.Query(ctx, `
SELECT s.id, s.user_id, s.problem_id, s.language_id, s.source_code, s.status,
       s.score, s.max_time_ms, s.max_memory_kb, s.submitted_at, s.judged_at
FROM submissions s
JOIN users u ON u.id = s.user_id
WHERE lower(u.username) = lower($1)
ORDER BY s.submitted_at DESC, s.id DESC
LIMIT $2`, username, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var submissions []Submission
	for rows.Next() {
		submission, err := scanSubmission(rows)
		if err != nil {
			return nil, err
		}
		submissions = append(submissions, submission)
	}
	return submissions, rows.Err()
}

func (s *Store) ListSolvedProblemsByUsername(ctx context.Context, username string) ([]Problem, error) {
	rows, err := s.pool.Query(ctx, `
SELECT DISTINCT ON (p.id)
       p.id, p.title, p.slug, p.statement_markdown, p.time_limit_ms,
       p.memory_limit_kb, p.score, p.difficulty, p.is_public,
       p.created_at, p.updated_at, p.created_by_user_id
FROM submissions s
JOIN users u ON u.id = s.user_id
JOIN problems p ON p.id = s.problem_id
WHERE lower(u.username) = lower($1)
  AND s.status = 'AC'
  AND p.is_public = true
ORDER BY p.id ASC, s.submitted_at ASC`, username)
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

type auditExecutor interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

func insertAdminAuditLog(ctx context.Context, tx auditExecutor, params AdminAuditLogParams) error {
	_, err := tx.Exec(ctx, `
INSERT INTO admin_audit_logs (actor_user_id, target_user_id, action, old_value, new_value)
VALUES ($1, $2, $3, $4, $5)`,
		params.ActorUserID,
		params.TargetUserID,
		params.Action,
		nullStringValue(params.OldValue),
		nullStringValue(params.NewValue),
	)
	return err
}

type userScanner interface {
	Scan(dest ...any) error
}

func scanUser(row userScanner) (User, error) {
	var user User
	err := row.Scan(
		&user.ID,
		&user.Username,
		&user.DisplayName,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.Rating,
		&user.Bio,
		&user.IconURL,
		&user.IsActive,
		&user.EmailVerifiedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	return user, err
}

func scanSession(row userScanner) (Session, error) {
	var session Session
	err := row.Scan(
		&session.ID,
		&session.UserID,
		&session.SessionTokenHash,
		&session.UserAgent,
		&session.IPAddress,
		&session.ExpiresAt,
		&session.CreatedAt,
		&session.RevokedAt,
	)
	return session, err
}

func boolNullString(value bool) sql.NullString {
	if value {
		return sql.NullString{String: "true", Valid: true}
	}
	return sql.NullString{String: "false", Valid: true}
}
