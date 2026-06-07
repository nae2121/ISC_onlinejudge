package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"onlinejudge/backend/internal/repository"
	"onlinejudge/backend/internal/service"
)

type Server struct {
	problems    *service.ProblemService
	submissions *service.SubmissionService
	auth        *service.AuthService
	users       *service.UserService
}

func NewServer(
	problems *service.ProblemService,
	submissions *service.SubmissionService,
	auth *service.AuthService,
	users *service.UserService,
) *Server {
	return &Server{
		problems:    problems,
		submissions: submissions,
		auth:        auth,
		users:       users,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.handleHealth)
	mux.HandleFunc("/api/auth/register", s.handleAuthRegister)
	mux.HandleFunc("/api/auth/login", s.handleAuthLogin)
	mux.Handle("/api/auth/logout", s.requireAuth(http.HandlerFunc(s.handleAuthLogout)))
	mux.Handle("/api/auth/me", s.requireAuth(http.HandlerFunc(s.handleAuthMe)))
	mux.HandleFunc("/api/users/", s.handleUserRoutes)
	mux.Handle("/api/me/profile", s.requireAuth(http.HandlerFunc(s.handleMeProfile)))
	mux.Handle("/api/me/password", s.requireAuth(http.HandlerFunc(s.handleMePassword)))
	mux.Handle("/api/me/submissions", s.requireAuth(http.HandlerFunc(s.handleMeSubmissions)))
	mux.Handle("/api/admin/users", s.requirePermission(service.PermissionManageUsers)(http.HandlerFunc(s.handleAdminUsers)))
	mux.Handle("/api/admin/users/", s.requirePermission(service.PermissionManageUsers)(http.HandlerFunc(s.handleAdminUserDetail)))
	mux.Handle("/api/admin/registration-pin", s.requirePermission(service.PermissionManageUsers)(http.HandlerFunc(s.handleAdminRegistrationPin)))
	mux.HandleFunc("/api/problems", s.handleProblems)
	mux.HandleFunc("/api/problems/", s.handleProblemDetail)
	mux.HandleFunc("/api/languages", s.handleLanguages)
	mux.Handle("/api/submissions", s.requireAuth(http.HandlerFunc(s.handleSubmissions)))
	mux.HandleFunc("/api/submissions/", s.handleSubmissionDetail)
	return requestTimeout(logging(mux), 15*time.Second)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleProblems(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	problems, err := s.problems.ListPublic(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	resp := make([]problemResponse, 0, len(problems))
	for _, problem := range problems {
		resp = append(resp, toProblemResponse(problem))
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleProblemDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	slug := strings.TrimPrefix(r.URL.Path, "/api/problems/")
	if slug == "" || strings.Contains(slug, "/") {
		writeError(w, http.StatusNotFound, "problem not found")
		return
	}
	problem, cases, err := s.problems.GetBySlug(r.Context(), slug)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "problem not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	resp := problemDetailResponse{
		Problem:   toProblemResponse(problem),
		TestCases: make([]testCaseResponse, 0, len(cases)),
	}
	for _, tc := range cases {
		resp.TestCases = append(resp.TestCases, toTestCaseResponse(tc))
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleLanguages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	languages, err := s.problems.ListLanguages(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	resp := make([]languageResponse, 0, len(languages))
	for _, language := range languages {
		resp = append(resp, toLanguageResponse(language))
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleSubmissions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req createSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, ok := currentUserFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if req.LanguageID == 0 || strings.TrimSpace(req.SourceCode) == "" {
		writeError(w, http.StatusBadRequest, "language_id and source_code are required")
		return
	}

	submission, err := s.submissions.Submit(r.Context(), service.CreateSubmissionInput{
		UserID:      user.ID,
		ProblemID:   req.ProblemID,
		ProblemSlug: req.ProblemSlug,
		LanguageID:  req.LanguageID,
		SourceCode:  req.SourceCode,
		Priority:    req.Priority,
	})
	if errors.Is(err, service.ErrProblemReferenceRequired) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "problem or language not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusAccepted, toSubmissionResponse(submission, nil))
}

func (s *Server) handleSubmissionDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	rawID := strings.TrimPrefix(r.URL.Path, "/api/submissions/")
	id, err := strconv.ParseInt(rawID, 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusNotFound, "submission not found")
		return
	}
	submission, err := s.submissions.Get(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "submission not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, toSubmissionResponse(submission.Submission, submission.Results))
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		_ = start
	})
}

func requestTimeout(next http.Handler, timeout time.Duration) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), timeout)
		defer cancel()
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

type createSubmissionRequest struct {
	ProblemID   int64  `json:"problem_id"`
	ProblemSlug string `json:"problem_slug"`
	LanguageID  int64  `json:"language_id"`
	SourceCode  string `json:"source_code"`
	Priority    int    `json:"priority"`
}

type problemResponse struct {
	ID                int64  `json:"id"`
	Title             string `json:"title"`
	Slug              string `json:"slug"`
	StatementMarkdown string `json:"statement_markdown,omitempty"`
	TimeLimitMS       int    `json:"time_limit_ms"`
	MemoryLimitKB     int    `json:"memory_limit_kb"`
	Score             int    `json:"score"`
	Difficulty        string `json:"difficulty,omitempty"`
	IsPublic          bool   `json:"is_public"`
}

type problemDetailResponse struct {
	Problem   problemResponse   `json:"problem"`
	TestCases []testCaseResponse `json:"test_cases"`
}

type testCaseResponse struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	IsSample   bool   `json:"is_sample"`
	Score      int    `json:"score"`
	GroupName  string `json:"group_name,omitempty"`
	OrderIndex int    `json:"order_index"`
}

type languageResponse struct {
	ID      int64  `json:"id"`
	Name    string `json:"name"`
	Version string `json:"version"`
}

type submissionResponse struct {
	ID          int64                      `json:"id"`
	UserID      int64                      `json:"user_id"`
	ProblemID   int64                      `json:"problem_id"`
	LanguageID  int64                      `json:"language_id"`
	Status      string                     `json:"status"`
	Score       int                        `json:"score"`
	MaxTimeMS   int                        `json:"max_time_ms"`
	MaxMemoryKB int                        `json:"max_memory_kb"`
	SubmittedAt time.Time                  `json:"submitted_at"`
	JudgedAt    *time.Time                 `json:"judged_at,omitempty"`
	Results     []submissionResultResponse `json:"results,omitempty"`
}

type submissionResultResponse struct {
	ID              int64  `json:"id"`
	TestCaseID      *int64 `json:"test_case_id,omitempty"`
	Status          string `json:"status"`
	ExecutionTimeMS int    `json:"execution_time_ms"`
	MemoryKB        int    `json:"memory_kb"`
	StdoutPath      string `json:"stdout_path,omitempty"`
	StderrPath      string `json:"stderr_path,omitempty"`
	ErrorMessage    string `json:"error_message,omitempty"`
}

func toProblemResponse(problem repository.Problem) problemResponse {
	return problemResponse{
		ID:                problem.ID,
		Title:             problem.Title,
		Slug:              problem.Slug,
		StatementMarkdown: problem.StatementMarkdown,
		TimeLimitMS:       problem.TimeLimitMS,
		MemoryLimitKB:     problem.MemoryLimitKB,
		Score:             problem.Score,
		Difficulty:        nullString(problem.Difficulty),
		IsPublic:          problem.IsPublic,
	}
}

func toTestCaseResponse(tc repository.TestCase) testCaseResponse {
	return testCaseResponse{
		ID:         tc.ID,
		Name:       tc.Name,
		IsSample:   tc.IsSample,
		Score:      tc.Score,
		GroupName:  nullString(tc.GroupName),
		OrderIndex: tc.OrderIndex,
	}
}

func toLanguageResponse(language repository.Language) languageResponse {
	return languageResponse{
		ID:      language.ID,
		Name:    language.Name,
		Version: language.Version,
	}
}

func toSubmissionResponse(submission repository.Submission, results []repository.SubmissionResult) submissionResponse {
	resp := submissionResponse{
		ID:          submission.ID,
		UserID:      submission.UserID,
		ProblemID:   submission.ProblemID,
		LanguageID:  submission.LanguageID,
		Status:      submission.Status,
		Score:       submission.Score,
		MaxTimeMS:   submission.MaxTimeMS,
		MaxMemoryKB: submission.MaxMemoryKB,
		SubmittedAt: submission.SubmittedAt,
		JudgedAt:    nullTime(submission.JudgedAt),
	}
	for _, result := range results {
		resp.Results = append(resp.Results, submissionResultResponse{
			ID:              result.ID,
			TestCaseID:      nullInt64(result.TestCaseID),
			Status:          result.Status,
			ExecutionTimeMS: result.ExecutionTimeMS,
			MemoryKB:        result.MemoryKB,
			StdoutPath:      nullString(result.StdoutPath),
			StderrPath:      nullString(result.StderrPath),
			ErrorMessage:    nullString(result.ErrorMessage),
		})
	}
	return resp
}

func nullString(value sql.NullString) string {
	if !value.Valid {
		return ""
	}
	return value.String
}

func nullTime(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

func nullInt64(value sql.NullInt64) *int64 {
	if !value.Valid {
		return nil
	}
	return &value.Int64
}
