package repository

import (
	"database/sql"
	"time"
)

const (
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
)

type Problem struct {
	ID                int64
	Title             string
	Slug              string
	StatementMarkdown string
	TimeLimitMS       int
	MemoryLimitKB     int
	Score             int
	Difficulty        sql.NullString
	IsPublic          bool
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
