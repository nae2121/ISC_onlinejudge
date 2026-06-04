package service

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"onlinejudge/backend/internal/repository"
)

var ErrProblemReferenceRequired = errors.New("problem_id or problem_slug is required")

type SubmissionService struct {
	store          *repository.Store
	defaultPriority int
}

type CreateSubmissionInput struct {
	UserID      int64
	ProblemID   int64
	ProblemSlug string
	LanguageID  int64
	SourceCode  string
	Priority    int
}

type SubmissionWithResults struct {
	Submission repository.Submission
	Results    []repository.SubmissionResult
}

func NewSubmissionService(store *repository.Store, defaultPriority int) *SubmissionService {
	return &SubmissionService{
		store:           store,
		defaultPriority: defaultPriority,
	}
}

func (s *SubmissionService) Submit(ctx context.Context, input CreateSubmissionInput) (repository.Submission, error) {
	problemID := input.ProblemID
	if problemID == 0 {
		if input.ProblemSlug == "" {
			return repository.Submission{}, ErrProblemReferenceRequired
		}
		problem, err := s.store.GetProblemBySlug(ctx, input.ProblemSlug)
		if err != nil {
			return repository.Submission{}, err
		}
		problemID = problem.ID
	}

	if _, err := s.store.GetProblemByID(ctx, problemID); err != nil {
		return repository.Submission{}, err
	}
	lang, err := s.store.GetLanguageByID(ctx, input.LanguageID)
	if err != nil {
		return repository.Submission{}, err
	}
	if !lang.IsActive {
		return repository.Submission{}, pgx.ErrNoRows
	}

	priority := input.Priority
	if priority == 0 {
		priority = s.defaultPriority
	}

	return s.store.CreateSubmissionWithJob(ctx, repository.CreateSubmissionParams{
		UserID:     input.UserID,
		ProblemID:  problemID,
		LanguageID: input.LanguageID,
		SourceCode: input.SourceCode,
		Priority:   priority,
	})
}

func (s *SubmissionService) Get(ctx context.Context, id int64) (SubmissionWithResults, error) {
	submission, err := s.store.GetSubmissionByID(ctx, id)
	if err != nil {
		return SubmissionWithResults{}, err
	}
	results, err := s.store.ListSubmissionResults(ctx, id)
	if err != nil {
		return SubmissionWithResults{}, err
	}
	return SubmissionWithResults{Submission: submission, Results: results}, nil
}
