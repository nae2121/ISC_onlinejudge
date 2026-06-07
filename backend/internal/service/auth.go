package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/mail"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"

	"onlinejudge/backend/internal/repository"
)

var (
	ErrDuplicateUser         = errors.New("username or email already exists")
	ErrInactiveUser          = errors.New("user is inactive")
	ErrInvalidCredentials    = errors.New("invalid username/email or password")
	ErrInvalidInput          = errors.New("invalid input")
	ErrInvalidPinCode        = errors.New("invalid pin code")
	ErrInvalidSession        = errors.New("invalid session")
	ErrTooManyLoginAttempts  = errors.New("too many login attempts")
	ErrUnsupportedRole       = errors.New("unsupported role")
	ErrCurrentPasswordFailed = errors.New("current password is incorrect")
)

var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9_][A-Za-z0-9_-]{2,31}$`)

type AuthService struct {
	store            *repository.Store
	sessionTTL       time.Duration
	registrationPin string
	failureMu        sync.Mutex
	failures         map[string]loginFailure
	maxFailures      int
	loginLockoutTime time.Duration
}

type loginFailure struct {
	Count       int
	LockedUntil time.Time
	LastFailure time.Time
}

type RegisterInput struct {
	Username    string
	DisplayName string
	Email       string
	Password    string
	PinCode     string
	UserAgent   string
	IPAddress   string
}

type LoginInput struct {
	Identity  string
	Password  string
	UserAgent string
	IPAddress string
}

type AuthResult struct {
	User      repository.User
	Token     string
	ExpiresAt time.Time
}

func NewAuthService(store *repository.Store, sessionTTL time.Duration, registrationPin string) *AuthService {
	return &AuthService{
		store:            store,
		sessionTTL:       sessionTTL,
		registrationPin: strings.TrimSpace(registrationPin),
		failures:         make(map[string]loginFailure),
		maxFailures:      5,
		loginLockoutTime: 15 * time.Minute,
	}
}

func (s *AuthService) Register(ctx context.Context, input RegisterInput) (AuthResult, error) {
	username := strings.TrimSpace(input.Username)
	displayName := strings.TrimSpace(input.DisplayName)
	email := strings.ToLower(strings.TrimSpace(input.Email))

	if !usernamePattern.MatchString(username) {
		return AuthResult{}, ErrInvalidInput
	}
	if displayName == "" {
		displayName = username
	}
	if len(displayName) > 80 || len(input.Password) < 8 {
		return AuthResult{}, ErrInvalidInput
	}
	if s.registrationPin == "" || strings.TrimSpace(input.PinCode) != s.registrationPin {
		return AuthResult{}, ErrInvalidPinCode
	}
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email {
		return AuthResult{}, ErrInvalidInput
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResult{}, err
	}

	user, err := s.store.CreateUser(ctx, repository.CreateUserParams{
		Username:     username,
		DisplayName:  displayName,
		Email:        email,
		PasswordHash: string(hash),
		Role:         repository.RoleUser,
		IsActive:     false,
	})
	if isUniqueViolation(err) {
		return AuthResult{}, ErrDuplicateUser
	}
	if err != nil {
		return AuthResult{}, err
	}
	return AuthResult{User: user}, nil
}

func (s *AuthService) RegistrationPinCode() string {
	return s.registrationPin
}

func (s *AuthService) Login(ctx context.Context, input LoginInput) (AuthResult, error) {
	identity := strings.TrimSpace(input.Identity)
	if identity == "" || input.Password == "" {
		return AuthResult{}, ErrInvalidCredentials
	}

	key := loginThrottleKey(identity, input.IPAddress)
	if s.isLoginBlocked(key) {
		return AuthResult{}, ErrTooManyLoginAttempts
	}

	user, err := s.store.GetUserByLogin(ctx, identity)
	if errors.Is(err, pgx.ErrNoRows) {
		s.recordLoginFailure(key)
		return AuthResult{}, ErrInvalidCredentials
	}
	if err != nil {
		return AuthResult{}, err
	}
	if !user.IsActive {
		s.recordLoginFailure(key)
		return AuthResult{}, ErrInactiveUser
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		s.recordLoginFailure(key)
		return AuthResult{}, ErrInvalidCredentials
	}

	s.clearLoginFailures(key)
	return s.createSession(ctx, user, input.UserAgent, input.IPAddress)
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.store.RevokeSessionByTokenHash(ctx, hashSessionToken(token))
}

func (s *AuthService) CurrentUser(ctx context.Context, token string) (repository.User, error) {
	if token == "" {
		return repository.User{}, ErrInvalidSession
	}
	user, _, err := s.store.GetUserBySessionTokenHash(ctx, hashSessionToken(token))
	if errors.Is(err, pgx.ErrNoRows) {
		return repository.User{}, ErrInvalidSession
	}
	if err != nil {
		return repository.User{}, err
	}
	return user, nil
}

func (s *AuthService) createSession(ctx context.Context, user repository.User, userAgent, ipAddress string) (AuthResult, error) {
	token, err := newSessionToken()
	if err != nil {
		return AuthResult{}, err
	}
	expiresAt := time.Now().UTC().Add(s.sessionTTL)
	if _, err := s.store.CreateSession(ctx, repository.CreateSessionParams{
		UserID:           user.ID,
		SessionTokenHash: hashSessionToken(token),
		UserAgent:        truncate(userAgent, 512),
		IPAddress:        truncate(ipAddress, 128),
		ExpiresAt:        expiresAt,
	}); err != nil {
		return AuthResult{}, err
	}
	return AuthResult{User: user, Token: token, ExpiresAt: expiresAt}, nil
}

func (s *AuthService) isLoginBlocked(key string) bool {
	s.failureMu.Lock()
	defer s.failureMu.Unlock()

	failure, ok := s.failures[key]
	if !ok {
		return false
	}
	if !failure.LockedUntil.IsZero() && time.Now().Before(failure.LockedUntil) {
		return true
	}
	if !failure.LockedUntil.IsZero() {
		delete(s.failures, key)
	}
	return false
}

func (s *AuthService) recordLoginFailure(key string) {
	s.failureMu.Lock()
	defer s.failureMu.Unlock()

	failure := s.failures[key]
	failure.Count++
	failure.LastFailure = time.Now()
	if failure.Count >= s.maxFailures {
		failure.LockedUntil = time.Now().Add(s.loginLockoutTime)
	}
	s.failures[key] = failure
}

func (s *AuthService) clearLoginFailures(key string) {
	s.failureMu.Lock()
	defer s.failureMu.Unlock()
	delete(s.failures, key)
}

func newSessionToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func hashSessionToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func loginThrottleKey(identity, ipAddress string) string {
	return strings.ToLower(strings.TrimSpace(identity)) + "|" + strings.TrimSpace(ipAddress)
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
