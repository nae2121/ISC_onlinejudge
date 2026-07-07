package judge

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"path/filepath"
	"time"

	"onlinejudge/backend/internal/queue"
	"onlinejudge/backend/internal/repository"
	"onlinejudge/backend/internal/storage"
)

type Queue interface {
	ClaimNext(ctx context.Context, workerID string) (*queue.Job, error)
	Complete(ctx context.Context, jobID int64) error
	Fail(ctx context.Context, jobID int64) error
	RequeueStale(ctx context.Context, staleAfter time.Duration) (int64, error)
}

type Worker struct {
	WorkerID         string
	Store            *repository.Store
	Queue            Queue
	Storage          storage.Storage
	Sandbox          Sandbox
	Comparator       Comparator
	PollInterval     time.Duration
	StaleAfter       time.Duration
	OutputLimitBytes int64
}

func (w *Worker) Run(ctx context.Context) error {
	if w.Comparator == nil {
		w.Comparator = TokenComparator{}
	}
	if w.Sandbox == nil {
		w.Sandbox = StubSandbox{}
	}
	if w.PollInterval == 0 {
		w.PollInterval = time.Second
	}

	ticker := time.NewTicker(w.PollInterval)
	defer ticker.Stop()

	for {
		if err := ctx.Err(); err != nil {
			return err
		}

		if w.StaleAfter > 0 {
			if _, err := w.Queue.RequeueStale(ctx, w.StaleAfter); err != nil {
				log.Printf("requeue stale jobs failed: %v", err)
			}
		}

		job, err := w.Queue.ClaimNext(ctx, w.WorkerID)
		if err != nil {
			log.Printf("claim job failed: %v", err)
		}
		if job != nil {
			if err := w.processJob(ctx, *job); err != nil {
				log.Printf("process job %d failed: %v", job.ID, err)
			}
			continue
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}

func (w *Worker) processJob(ctx context.Context, job queue.Job) error {
	submission, err := w.Store.GetSubmissionByID(ctx, job.SubmissionID)
	if err != nil {
		_ = w.Queue.Fail(ctx, job.ID)
		return err
	}

	if err := w.Store.DeleteSubmissionResults(ctx, submission.ID); err != nil {
		_ = w.Queue.Fail(ctx, job.ID)
		return err
	}
	if err := w.Store.UpdateSubmissionRunning(ctx, submission.ID); err != nil {
		_ = w.Queue.Fail(ctx, job.ID)
		return err
	}

	problem, err := w.Store.GetProblemByID(ctx, submission.ProblemID)
	if err != nil {
		return w.failSubmission(ctx, job.ID, submission.ID, fmt.Errorf("load problem: %w", err))
	}
	language, err := w.Store.GetLanguageByID(ctx, submission.LanguageID)
	if err != nil {
		return w.failSubmission(ctx, job.ID, submission.ID, fmt.Errorf("load language: %w", err))
	}
	testCases, err := w.Store.ListTestCasesByProblemID(ctx, problem.ID, true)
	if err != nil {
		return w.failSubmission(ctx, job.ID, submission.ID, fmt.Errorf("load test cases: %w", err))
	}
	if len(testCases) == 0 {
		return w.failSubmission(ctx, job.ID, submission.ID, errors.New("problem has no test cases"))
	}

	workDir := filepath.Join("tmp", fmt.Sprintf("submission-%d", submission.ID))
	defer func() {
		if err := w.Sandbox.Cleanup(ctx, workDir); err != nil && !errors.Is(err, context.Canceled) {
			log.Printf("cleanup %s failed: %v", workDir, err)
		}
	}()

	sourcePath := filepath.Join(workDir, language.SourceFileName)
	if err := w.Storage.Write(ctx, sourcePath, []byte(submission.SourceCode)); err != nil {
		return w.failSubmission(ctx, job.ID, submission.ID, fmt.Errorf("write source: %w", err))
	}

	compile, err := w.Sandbox.Compile(ctx, CompileRequest{
		WorkDir:    workDir,
		Language:   language,
		SourcePath: sourcePath,
		SourceCode: submission.SourceCode,
	})
	if err != nil {
		return w.failSubmission(ctx, job.ID, submission.ID, err)
	}
	if compile == nil {
		return w.failSubmission(ctx, job.ID, submission.ID, errors.New("compile returned nil result"))
	}
	if !compile.OK {
		stderrPath := w.submissionArtifactPath(submission.ID, "compile.stderr")
		_ = w.Storage.Write(ctx, stderrPath, compile.Stderr)
		if _, err := w.Store.InsertSubmissionResult(ctx, repository.InsertResultParams{
			SubmissionID: submission.ID,
			Status:       repository.SubmissionCompileError,
			StderrPath:   sql.NullString{String: stderrPath, Valid: true},
		}); err != nil {
			return w.failSubmission(ctx, job.ID, submission.ID, fmt.Errorf("insert compile result: %w", err))
		}
		_ = w.Store.UpdateSubmissionFinal(ctx, submission.ID, repository.SubmissionCompileError, 0, 0, 0)
		return w.Queue.Complete(ctx, job.ID)
	}

	finalStatus := repository.SubmissionAccepted
	totalScore := 0
	maxTime := 0
	maxMemory := 0

	for _, tc := range testCases {
		inputPath := tc.InputPath
		input, err := w.Storage.Read(ctx, inputPath)
		if err != nil {
			return w.failSubmission(ctx, job.ID, submission.ID, fmt.Errorf("read input: %w", err))
		}
		expected, err := w.Storage.Read(ctx, tc.OutputPath)
		if err != nil {
			return w.failSubmission(ctx, job.ID, submission.ID, fmt.Errorf("read expected output: %w", err))
		}

		timeLimit := time.Duration(float64(problem.TimeLimitMS)*language.TimeLimitMultiplier) * time.Millisecond
		memoryLimitKB := int(float64(problem.MemoryLimitKB) * language.MemoryLimitMultiplier)

		run, err := w.Sandbox.Run(ctx, RunRequest{
			WorkDir:          workDir,
			Language:         language,
			ExecutablePath:   compile.OutputPath,
			InputPath:        inputPath,
			Input:            input,
			SourceCode:       submission.SourceCode,
			TimeLimit:        timeLimit,
			MemoryLimitKB:    memoryLimitKB,
			OutputLimitBytes: w.OutputLimitBytes,
		})
		if err != nil {
			return w.failSubmission(ctx, job.ID, submission.ID, err)
		}
		if run == nil {
			return w.failSubmission(ctx, job.ID, submission.ID, errors.New("run returned nil result"))
		}

		status := run.Status
		if status == repository.SubmissionAccepted && !w.Comparator.Compare(expected, run.Stdout) {
			status = repository.SubmissionWrongAnswer
		}
		if status == repository.SubmissionAccepted {
			totalScore += tc.Score
		} else if finalStatus == repository.SubmissionAccepted {
			finalStatus = status
		}
		if run.TimeMS > maxTime {
			maxTime = run.TimeMS
		}
		if run.MemoryKB > maxMemory {
			maxMemory = run.MemoryKB
		}

		stdoutPath := w.submissionArtifactPath(submission.ID, fmt.Sprintf("case_%03d.stdout", tc.OrderIndex))
		stderrPath := w.submissionArtifactPath(submission.ID, fmt.Sprintf("case_%03d.stderr", tc.OrderIndex))
		_ = w.Storage.Write(ctx, stdoutPath, run.Stdout)
		_ = w.Storage.Write(ctx, stderrPath, run.Stderr)

		_, err = w.Store.InsertSubmissionResult(ctx, repository.InsertResultParams{
			SubmissionID:    submission.ID,
			TestCaseID:      sql.NullInt64{Int64: tc.ID, Valid: true},
			Status:          status,
			ExecutionTimeMS: run.TimeMS,
			MemoryKB:        run.MemoryKB,
			StdoutPath:      sql.NullString{String: stdoutPath, Valid: len(run.Stdout) > 0},
			StderrPath:      sql.NullString{String: stderrPath, Valid: len(run.Stderr) > 0},
			ErrorMessage:    sql.NullString{String: run.ErrorMessage, Valid: run.ErrorMessage != ""},
		})
		if err != nil {
			return w.failSubmission(ctx, job.ID, submission.ID, fmt.Errorf("insert result: %w", err))
		}
		if status != repository.SubmissionAccepted {
			break
		}
	}

	if err := w.Store.UpdateSubmissionFinal(ctx, submission.ID, finalStatus, totalScore, maxTime, maxMemory); err != nil {
		_ = w.Queue.Fail(ctx, job.ID)
		return err
	}
	return w.Queue.Complete(ctx, job.ID)
}

func (w *Worker) failSubmission(ctx context.Context, jobID, submissionID int64, cause error) error {
	message := ""
	if cause != nil {
		message = cause.Error()
	}
	_, _ = w.Store.InsertSubmissionResult(ctx, repository.InsertResultParams{
		SubmissionID: submissionID,
		Status:       repository.SubmissionInternalErr,
		ErrorMessage: sql.NullString{String: message, Valid: message != ""},
	})
	_ = w.Store.UpdateSubmissionFinal(ctx, submissionID, repository.SubmissionInternalErr, 0, 0, 0)
	_ = w.Queue.Fail(ctx, jobID)
	return cause
}

func (w *Worker) submissionArtifactPath(submissionID int64, name string) string {
	now := time.Now().UTC()
	return filepath.Join(
		"submissions",
		fmt.Sprintf("%04d", now.Year()),
		fmt.Sprintf("%02d", int(now.Month())),
		fmt.Sprintf("%02d", now.Day()),
		fmt.Sprintf("%d", submissionID),
		name,
	)
}
