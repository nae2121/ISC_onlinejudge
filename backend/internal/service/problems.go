package service

import (
	"context"

	"onlinejudge/backend/internal/repository"
)

type ProblemService struct {
	store *repository.Store
}

func NewProblemService(store *repository.Store) *ProblemService {
	return &ProblemService{store: store}
}

func (s *ProblemService) ListPublic(ctx context.Context) ([]repository.Problem, error) {
	return s.store.ListPublicProblems(ctx)
}

func (s *ProblemService) GetBySlug(ctx context.Context, slug string) (repository.Problem, []repository.TestCase, error) {
	problem, err := s.store.GetProblemBySlug(ctx, slug)
	if err != nil {
		return repository.Problem{}, nil, err
	}
	cases, err := s.store.ListTestCasesByProblemID(ctx, problem.ID, false)
	if err != nil {
		return repository.Problem{}, nil, err
	}
	return problem, cases, nil
}

func (s *ProblemService) ListLanguages(ctx context.Context) ([]repository.Language, error) {
	return s.store.ListActiveLanguages(ctx)
}
