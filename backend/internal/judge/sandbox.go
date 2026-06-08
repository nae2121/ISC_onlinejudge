package judge

import (
	"context"
	"errors"
	"time"

	"onlinejudge/backend/internal/repository"
)

var ErrSandboxNotConfigured = errors.New("sandbox is not configured")

type Sandbox interface {
	Compile(ctx context.Context, req CompileRequest) (*CompileResult, error)
	Run(ctx context.Context, req RunRequest) (*RunResult, error)
	Cleanup(ctx context.Context, workDir string) error
}

type CompileRequest struct {
	WorkDir    string
	Language   repository.Language
	SourcePath string
	SourceCode string
}

type CompileResult struct {
	OK         bool
	Stderr     []byte
	OutputPath string
}

type RunRequest struct {
	WorkDir          string
	Language         repository.Language
	ExecutablePath   string
	InputPath        string
	Input            []byte
	SourceCode       string
	TimeLimit        time.Duration
	MemoryLimitKB    int
	OutputLimitBytes int64
}

type RunResult struct {
	Status       string
	Stdout       []byte
	Stderr       []byte
	ExitCode     int
	TimeMS       int
	MemoryKB     int
	ErrorMessage string
}

type StubSandbox struct{}

func (StubSandbox) Compile(ctx context.Context, req CompileRequest) (*CompileResult, error) {
	return nil, ErrSandboxNotConfigured
}

func (StubSandbox) Run(ctx context.Context, req RunRequest) (*RunResult, error) {
	return nil, ErrSandboxNotConfigured
}

func (StubSandbox) Cleanup(ctx context.Context, workDir string) error {
	return ctx.Err()
}

// Placeholder adapters keep the worker independent from a concrete runner.
// Each can replace StubSandbox with a real implementation later.
type DockerSandbox struct{ StubSandbox }
type IsolateSandbox struct{ StubSandbox }
