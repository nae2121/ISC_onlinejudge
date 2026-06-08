package service

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"onlinejudge/backend/internal/repository"
)

type UserService struct {
	store *repository.Store
}

type UpdateProfileInput struct {
	DisplayName *string
	Bio         *string
	IconURL     *string
}

func NewUserService(store *repository.Store) *UserService {
	return &UserService{store: store}
}

func (s *UserService) GetByUsername(ctx context.Context, username string) (repository.User, error) {
	user, err := s.store.GetUserByUsername(ctx, strings.TrimSpace(username))
	if err != nil {
		return repository.User{}, err
	}
	if !user.IsActive {
		return repository.User{}, pgx.ErrNoRows
	}
	return user, nil
}

func (s *UserService) GetByID(ctx context.Context, id int64) (repository.User, error) {
	return s.store.GetUserByID(ctx, id)
}

func (s *UserService) GetStats(ctx context.Context, userID int64) (repository.UserStats, error) {
	return s.store.GetUserStats(ctx, userID)
}

func (s *UserService) ListUsers(ctx context.Context, limit, offset int) ([]repository.User, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	return s.store.ListUsers(ctx, repository.ListUsersParams{Limit: limit, Offset: offset})
}

func (s *UserService) UpdateProfile(ctx context.Context, userID int64, input UpdateProfileInput) (repository.User, error) {
	current, err := s.store.GetUserByID(ctx, userID)
	if err != nil {
		return repository.User{}, err
	}
	if !current.IsActive {
		return repository.User{}, ErrInactiveUser
	}

	displayName := current.DisplayName
	if input.DisplayName != nil {
		displayName = strings.TrimSpace(*input.DisplayName)
		if displayName == "" {
			displayName = current.Username
		}
	}
	bio := current.Bio
	if input.Bio != nil {
		bio = strings.TrimSpace(*input.Bio)
	}
	iconURL := ""
	if current.IconURL.Valid {
		iconURL = current.IconURL.String
	}
	if input.IconURL != nil {
		iconURL = strings.TrimSpace(*input.IconURL)
	}
	if len(displayName) > 80 || len(bio) > 2000 || len(iconURL) > 2048 {
		return repository.User{}, ErrInvalidInput
	}

	return s.store.UpdateUserProfile(ctx, repository.UpdateUserProfileParams{
		UserID:      userID,
		DisplayName: displayName,
		Bio:         bio,
		IconURL:     sql.NullString{String: iconURL, Valid: iconURL != ""},
	})
}

func (s *UserService) UpdatePassword(ctx context.Context, userID int64, currentPassword, newPassword string) error {
	if len(newPassword) < 8 {
		return ErrInvalidInput
	}
	user, err := s.store.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	if !user.IsActive {
		return ErrInactiveUser
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrCurrentPasswordFailed
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if err := s.store.UpdateUserPasswordHash(ctx, userID, string(hash)); err != nil {
		return err
	}
	return s.store.RevokeSessionsByUserID(ctx, userID)
}

func (s *UserService) ListSubmissionsByUsername(ctx context.Context, username string, limit int) ([]repository.Submission, error) {
	if _, err := s.GetByUsername(ctx, username); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	return s.store.ListSubmissionsByUsername(ctx, username, limit)
}

func (s *UserService) ListSolvedProblemsByUsername(ctx context.Context, username string) ([]repository.Problem, error) {
	if _, err := s.GetByUsername(ctx, username); err != nil {
		return nil, err
	}
	return s.store.ListSolvedProblemsByUsername(ctx, username)
}

func (s *UserService) AdminUpdateRole(ctx context.Context, actorUserID, targetUserID int64, role string) (repository.User, error) {
	role = strings.TrimSpace(role)
	if !IsValidRole(role) {
		return repository.User{}, ErrUnsupportedRole
	}
	return s.store.UpdateUserRoleWithAudit(ctx, actorUserID, targetUserID, role)
}

func (s *UserService) AdminUpdateActive(ctx context.Context, actorUserID, targetUserID int64, isActive bool) (repository.User, error) {
	if actorUserID == targetUserID && !isActive {
		return repository.User{}, ErrInvalidInput
	}
	return s.store.UpdateUserActiveWithAudit(ctx, actorUserID, targetUserID, isActive)
}

func (s *UserService) AdminDelete(ctx context.Context, actorUserID, targetUserID int64) error {
	if actorUserID == targetUserID {
		return ErrInvalidInput
	}
	err := s.store.SoftDeleteUserWithAudit(ctx, actorUserID, targetUserID)
	if errors.Is(err, pgx.ErrNoRows) {
		return pgx.ErrNoRows
	}
	return err
}
