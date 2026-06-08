package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"

	"onlinejudge/backend/internal/repository"
	"onlinejudge/backend/internal/service"
)

func (s *Server) handleAdminProblems(w http.ResponseWriter, r *http.Request) {
	user, ok := currentUserFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	switch r.Method {
	case http.MethodGet:
		problems, err := s.problems.ListAdmin(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		resp := make([]adminProblemResponse, 0, len(problems))
		for _, problem := range problems {
			resp = append(resp, toAdminProblemResponse(problem))
		}
		writeJSON(w, http.StatusOK, map[string]any{"problems": resp})
	case http.MethodPost:
		var req adminProblemRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		problem, err := s.problems.CreateAdmin(r.Context(), user.ID, req.toInput())
		if err != nil {
			writeServiceError(w, err)
			return
		}
		cases, err := s.problems.ListAdminTestCases(r.Context(), problem.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, toAdminProblemDetailResponse(problem, cases))
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) handleAdminProblemDetail(w http.ResponseWriter, r *http.Request) {
	user, ok := currentUserFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	parts, ok := pathParts(r.URL.Path, "/api/admin/problems/")
	if !ok || len(parts) == 0 {
		writeError(w, http.StatusNotFound, "admin problem route not found")
		return
	}
	id, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusNotFound, "problem not found")
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			problem, err := s.problems.GetAdmin(r.Context(), id)
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "problem not found")
				return
			}
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			cases, err := s.problems.ListAdminTestCases(r.Context(), problem.ID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, toAdminProblemDetailResponse(problem, cases))
		case http.MethodPatch:
			var req adminProblemRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeError(w, http.StatusBadRequest, "invalid json")
				return
			}
			problem, err := s.problems.UpdateAdmin(r.Context(), id, req.toInput())
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "problem not found")
				return
			}
			if err != nil {
				writeServiceError(w, err)
				return
			}
			cases, err := s.problems.ListAdminTestCases(r.Context(), problem.ID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, toAdminProblemDetailResponse(problem, cases))
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
		return
	}

	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var problem repository.AdminProblem
	switch parts[1] {
	case "publish":
		problem, err = s.problems.PublishAdmin(r.Context(), id)
	case "unpublish":
		problem, err = s.problems.UnpublishAdmin(r.Context(), id)
	case "archive":
		problem, err = s.problems.ArchiveAdmin(r.Context(), id)
	case "copy":
		problem, err = s.problems.CopyAdmin(r.Context(), user.ID, id)
	default:
		writeError(w, http.StatusNotFound, "admin problem route not found")
		return
	}
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "problem not found")
		return
	}
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toAdminProblemResponse(problem))
}

type adminProblemRequest struct {
	Title             string   `json:"title"`
	Slug              string   `json:"slug"`
	ProblemCode       string   `json:"problem_code"`
	StatementMarkdown string   `json:"statement_markdown"`
	Constraints       string   `json:"constraints"`
	InputFormat       string   `json:"input_format"`
	OutputFormat      string   `json:"output_format"`
	TimeLimitMS       int      `json:"time_limit_ms"`
	MemoryLimitMB     int      `json:"memory_limit_mb"`
	MemoryLimitKB     int      `json:"memory_limit_kb"`
	Score             int      `json:"score"`
	Difficulty        string   `json:"difficulty"`
	Tags              []string `json:"tags"`
	IsPublic          bool     `json:"is_public"`
	TestCases         []adminProblemTestCaseRequest `json:"test_cases"`
}

type adminProblemTestCaseRequest struct {
	Name     string `json:"name"`
	Input    string `json:"input"`
	Output   string `json:"output"`
	IsSample bool   `json:"is_sample"`
	Score    int    `json:"score"`
}

func (r adminProblemRequest) toInput() service.AdminProblemInput {
	memoryLimitKB := r.MemoryLimitKB
	if memoryLimitKB <= 0 && r.MemoryLimitMB > 0 {
		memoryLimitKB = r.MemoryLimitMB * 1000
	}
	if memoryLimitKB <= 0 {
		memoryLimitKB = 256000
	}
	return service.AdminProblemInput{
		Title:             r.Title,
		Slug:              r.Slug,
		ProblemCode:       r.ProblemCode,
		StatementMarkdown: r.StatementMarkdown,
		ConstraintsText:   r.Constraints,
		InputFormat:       r.InputFormat,
		OutputFormat:      r.OutputFormat,
		TimeLimitMS:       r.TimeLimitMS,
		MemoryLimitKB:     memoryLimitKB,
		Score:             r.Score,
		Difficulty:        r.Difficulty,
		Tags:              r.Tags,
		IsPublic:          r.IsPublic,
		TestCases:         toAdminProblemTestCaseInput(r.TestCases),
	}
}

type adminProblemResponse struct {
	ID                int64     `json:"id"`
	Title             string    `json:"title"`
	Slug              string    `json:"slug"`
	ProblemCode       string    `json:"problem_code"`
	StatementMarkdown string    `json:"statement_markdown"`
	Constraints       string    `json:"constraints"`
	InputFormat       string    `json:"input_format"`
	OutputFormat      string    `json:"output_format"`
	TimeLimitMS       int       `json:"time_limit_ms"`
	MemoryLimitKB     int       `json:"memory_limit_kb"`
	MemoryLimitMB     int       `json:"memory_limit_mb"`
	Score             int       `json:"score"`
	Difficulty        string    `json:"difficulty"`
	Tags              []string  `json:"tags"`
	IsPublic          bool      `json:"is_public"`
	Status            string    `json:"status"`
	TestCaseCount     int       `json:"test_case_count"`
	SampleCaseCount   int       `json:"sample_case_count"`
	HiddenCaseCount   int       `json:"hidden_case_count"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	TestCases         []adminProblemTestCaseResponse `json:"test_cases,omitempty"`
}

type adminProblemTestCaseResponse struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Input      string `json:"input"`
	Output     string `json:"output"`
	IsSample   bool   `json:"is_sample"`
	IsHidden   bool   `json:"is_hidden"`
	Score      int    `json:"score"`
	OrderIndex int    `json:"order_index"`
}

func toAdminProblemResponse(problem repository.AdminProblem) adminProblemResponse {
	return adminProblemResponse{
		ID:                problem.ID,
		Title:             problem.Title,
		Slug:              problem.Slug,
		ProblemCode:       problem.ProblemCode,
		StatementMarkdown: problem.StatementMarkdown,
		Constraints:       problem.ConstraintsText,
		InputFormat:       problem.InputFormat,
		OutputFormat:      problem.OutputFormat,
		TimeLimitMS:       problem.TimeLimitMS,
		MemoryLimitKB:     problem.MemoryLimitKB,
		MemoryLimitMB:     problem.MemoryLimitKB / 1000,
		Score:             problem.Score,
		Difficulty:        nullString(problem.Difficulty),
		Tags:              problem.Tags,
		IsPublic:          problem.IsPublic,
		Status:            problem.Status,
		TestCaseCount:     problem.TestCaseCount,
		SampleCaseCount:   problem.SampleCaseCount,
		HiddenCaseCount:   problem.HiddenCaseCount,
		CreatedAt:         problem.CreatedAt,
		UpdatedAt:         problem.UpdatedAt,
	}
}

func toAdminProblemDetailResponse(problem repository.AdminProblem, cases []service.AdminProblemTestCase) adminProblemResponse {
	resp := toAdminProblemResponse(problem)
	resp.TestCases = make([]adminProblemTestCaseResponse, 0, len(cases))
	for _, tc := range cases {
		resp.TestCases = append(resp.TestCases, adminProblemTestCaseResponse{
			ID:         tc.ID,
			Name:       tc.Name,
			Input:      tc.Input,
			Output:     tc.Output,
			IsSample:   tc.IsSample,
			IsHidden:   tc.IsHidden,
			Score:      tc.Score,
			OrderIndex: tc.OrderIndex,
		})
	}
	return resp
}

func toAdminProblemTestCaseInput(cases []adminProblemTestCaseRequest) []service.AdminProblemTestCaseInput {
	if cases == nil {
		return nil
	}

	resp := make([]service.AdminProblemTestCaseInput, 0, len(cases))
	for _, tc := range cases {
		resp = append(resp, service.AdminProblemTestCaseInput{
			Name:     tc.Name,
			Input:    tc.Input,
			Output:   tc.Output,
			IsSample: tc.IsSample,
			Score:    tc.Score,
		})
	}
	return resp
}
