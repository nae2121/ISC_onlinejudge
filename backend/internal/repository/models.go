package repository

import (
	"database/sql"
	"time"
)

const (
	RoleUser          = "user"
	RoleAdmin         = "admin"
	RoleProblemSetter = "problem_setter"
	RoleJudgeAdmin    = "judge_admin"

	SubmissionWaitingJudge = "WJ"
	SubmissionAccepted     = "AC"
	SubmissionWrongAnswer  = "WA"
	SubmissionTLE          = "TLE"
	SubmissionMLE          = "MLE"
	SubmissionRuntimeError = "RE"
	SubmissionCompileError = "CE"
	SubmissionOutputLimit  = "OLE"
	SubmissionInternalErr  = "IE"

	JobQueued    = "queued"
	JobRunning   = "running"
	JobCompleted = "completed"
	JobFailed    = "failed"

	ContestParticipantRegistered = "registered"
	ContestParticipantCancelled  = "cancelled"
	ContestParticipantBanned     = "banned"

	ProblemStatusDraft    = "draft"
	ProblemStatusPrivate  = "private"
	ProblemStatusPublic   = "public"
	ProblemStatusArchived = "archived"
)

type User struct {
	ID              int64
	Username        string
	DisplayName     string
	Email           string
	PasswordHash    string
	Role            string
	Rating          int
	Bio             string
	IconURL         sql.NullString
	IsActive        bool
	EmailVerifiedAt sql.NullTime
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type UserStats struct {
	SolvedCount      int
	Points           int
	SubmissionsCount int
}

type Problem struct {
	ID                int64
	CreatedByUserID   sql.NullInt64
	Title             string
	Slug              string
	StatementMarkdown string
	ConstraintsText   string
	InputFormat       string
	OutputFormat      string
	TimeLimitMS       int
	MemoryLimitKB     int
	Score             int
	Difficulty        sql.NullString
	IsPublic          bool
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type AdminProblem struct {
	ID                int64
	CreatedByUserID   sql.NullInt64
	Title             string
	Slug              string
	ProblemCode       string
	StatementMarkdown string
	ConstraintsText   string
	InputFormat       string
	OutputFormat      string
	TimeLimitMS       int
	MemoryLimitKB     int
	Score             int
	Difficulty        sql.NullString
	Tags              []string
	IsPublic          bool
	Status            string
	ArchivedAt        sql.NullTime
	TestCaseCount     int
	SampleCaseCount   int
	HiddenCaseCount   int
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type TestCase struct {
	ID         int64
	ProblemID  int64
	Name       string
	InputPath  string
	OutputPath string
	IsSample   bool
	IsHidden   bool
	Score      int
	GroupName  sql.NullString
	OrderIndex int
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type Language struct {
	ID                  int64
	Name                string
	Version             string
	SourceFileName      string
	CompileCommand      sql.NullString
	RunCommand          string
	TimeLimitMultiplier   float64
	MemoryLimitMultiplier float64
	IsActive              bool
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

type Submission struct {
	ID          int64
	UserID      int64
	ProblemID   int64
	LanguageID  int64
	SourceCode  string
	Status      string
	Score       int
	MaxTimeMS   int
	MaxMemoryKB int
	SubmittedAt time.Time
	JudgedAt    sql.NullTime
}

type SubmissionResult struct {
	ID              int64
	SubmissionID    int64
	TestCaseID      sql.NullInt64
	Status          string
	ExecutionTimeMS int
	MemoryKB        int
	StdoutPath      sql.NullString
	StderrPath      sql.NullString
	ErrorMessage    sql.NullString
	CreatedAt       time.Time
}

type Session struct {
	ID               int64
	UserID           int64
	SessionTokenHash string
	UserAgent        string
	IPAddress        string
	ExpiresAt        time.Time
	CreatedAt        time.Time
	RevokedAt        sql.NullTime
}

type ContestParticipant struct {
	ID           int64
	ContestID    int64
	UserID       int64
	RegisteredAt time.Time
	Status       string
}

type CreateUserParams struct {
	Username     string
	DisplayName  string
	Email        string
	PasswordHash string
	Role         string
	IsActive     bool
}

type UpdateUserProfileParams struct {
	UserID      int64
	DisplayName string
	Bio         string
	IconURL     sql.NullString
}

type AdminProblemParams struct {
	Title             string
	Slug              string
	ProblemCode       string
	StatementMarkdown string
	ConstraintsText   string
	InputFormat       string
	OutputFormat      string
	TimeLimitMS       int
	MemoryLimitKB     int
	Score             int
	Difficulty        sql.NullString
	Tags              []string
	IsPublic          bool
	Status            string
	CreatedByUserID   sql.NullInt64
}

type AdminTestCaseParams struct {
	Name       string
	InputPath  string
	OutputPath string
	IsSample   bool
	IsHidden   bool
	Score      int
	GroupName  sql.NullString
	OrderIndex int
}

type CreateSessionParams struct {
	UserID           int64
	SessionTokenHash string
	UserAgent        string
	IPAddress        string
	ExpiresAt        time.Time
}

type ListUsersParams struct {
	Limit  int
	Offset int
}

type AdminAuditLogParams struct {
	ActorUserID int64
	TargetUserID int64
	Action      string
	OldValue    sql.NullString
	NewValue    sql.NullString
}

type CreateSubmissionParams struct {
	UserID     int64
	ProblemID  int64
	LanguageID int64
	SourceCode string
	Priority   int
}

type InsertResultParams struct {
	SubmissionID    int64
	TestCaseID      sql.NullInt64
	Status          string
	ExecutionTimeMS int
	MemoryKB        int
	StdoutPath      sql.NullString
	StderrPath      sql.NullString
	ErrorMessage    sql.NullString
}
