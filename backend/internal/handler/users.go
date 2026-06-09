package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"onlinejudge/backend/internal/repository"
	"onlinejudge/backend/internal/service"
)

func (s *Server) handleUserRoutes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	parts, ok := pathParts(r.URL.Path, "/api/users/")
	if !ok || len(parts) == 0 || len(parts) > 2 {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	username := parts[0]

	switch {
	case len(parts) == 1:
		user, err := s.users.GetByUsername(r.Context(), username)
		if err != nil {
			writeServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, toUserProfileResponse(user))
	case parts[1] == "submissions":
		limit := parseQueryInt(r, "limit", 50)
		submissions, err := s.users.ListSubmissionsByUsername(r.Context(), username, limit)
		if err != nil {
			writeServiceError(w, err)
			return
		}
		resp := make([]submissionResponse, 0, len(submissions))
		for _, submission := range submissions {
			resp = append(resp, toSubmissionResponse(submission, nil))
		}
		writeJSON(w, http.StatusOK, resp)
	case parts[1] == "solved":
		problems, err := s.users.ListSolvedProblemsByUsername(r.Context(), username)
		if err != nil {
			writeServiceError(w, err)
			return
		}
		resp := make([]problemResponse, 0, len(problems))
		for _, problem := range problems {
			resp = append(resp, toProblemResponse(problem))
		}
		writeJSON(w, http.StatusOK, resp)
	default:
		writeError(w, http.StatusNotFound, "user route not found")
	}
}

func (s *Server) handleAdminUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	limit := parseQueryInt(r, "limit", 50)
	offset := parseQueryInt(r, "offset", 0)
	users, err := s.users.ListUsers(r.Context(), limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	resp := make([]adminUserResponse, 0, len(users))
	for _, user := range users {
		resp = append(resp, toAdminUserResponse(user))
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleAdminUserDetail(w http.ResponseWriter, r *http.Request) {
	parts, ok := pathParts(r.URL.Path, "/api/admin/users/")
	if !ok || len(parts) == 0 || len(parts) > 2 {
		writeError(w, http.StatusNotFound, "admin user route not found")
		return
	}

	id, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	actor, ok := currentUserFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			user, err := s.users.GetByID(r.Context(), id)
			if err != nil {
				writeServiceError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, toAdminUserResponse(user))
		case http.MethodDelete:
			if err := s.users.AdminDelete(r.Context(), actor.ID, id); err != nil {
				writeServiceError(w, err)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
		return
	}

	if parts[1] == "password" {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		var req adminPasswordRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if err := s.users.AdminUpdatePassword(r.Context(), id, req.Password); err != nil {
			writeServiceError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	switch parts[1] {
	case "role":
		var req adminRoleRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		user, err := s.users.AdminUpdateRole(r.Context(), actor.ID, id, req.Role)
		if err != nil {
			writeServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, toAdminUserResponse(user))
	case "active":
		var req adminActiveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if req.IsActive == nil {
			writeError(w, http.StatusBadRequest, "is_active is required")
			return
		}
		user, err := s.users.AdminUpdateActive(r.Context(), actor.ID, id, *req.IsActive)
		if err != nil {
			writeServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, toAdminUserResponse(user))
	default:
		writeError(w, http.StatusNotFound, "admin user route not found")
	}
}

func pathParts(path, prefix string) ([]string, bool) {
	if !strings.HasPrefix(path, prefix) {
		return nil, false
	}
	trimmed := strings.Trim(strings.TrimPrefix(path, prefix), "/")
	if trimmed == "" {
		return nil, false
	}
	rawParts := strings.Split(trimmed, "/")
	parts := make([]string, 0, len(rawParts))
	for _, part := range rawParts {
		value, err := url.PathUnescape(part)
		if err != nil || value == "" {
			return nil, false
		}
		parts = append(parts, value)
	}
	return parts, true
}

func parseQueryInt(r *http.Request, key string, fallback int) int {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func toUserProfileResponse(user repository.User) userProfileResponse {
	return userProfileResponse{
		ID:          user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Role:        user.Role,
		Rating:      user.Rating,
		Bio:         user.Bio,
		IconURL:     nullString(user.IconURL),
		CreatedAt:   user.CreatedAt,
	}
}

func (s *Server) currentUserResponse(ctx context.Context, user repository.User) (currentUserResponse, error) {
	stats, err := s.users.GetStats(ctx, user.ID)
	if err != nil {
		return currentUserResponse{}, err
	}
	return toCurrentUserResponse(user, stats), nil
}

func toCurrentUserResponse(user repository.User, stats repository.UserStats) currentUserResponse {
	return currentUserResponse{
		ID:               user.ID,
		Username:         user.Username,
		DisplayName:      user.DisplayName,
		Email:            user.Email,
		Role:             user.Role,
		Permissions:      rolePermissions(user.Role),
		Rating:           user.Rating,
		SolvedCount:      stats.SolvedCount,
		Points:           stats.Points,
		SubmissionsCount: stats.SubmissionsCount,
		Bio:              user.Bio,
		IconURL:          nullString(user.IconURL),
		IsActive:         user.IsActive,
		EmailVerifiedAt:  nullTime(user.EmailVerifiedAt),
		CreatedAt:        user.CreatedAt,
		UpdatedAt:        user.UpdatedAt,
	}
}

func toAdminUserResponse(user repository.User) adminUserResponse {
	return adminUserResponse{
		ID:              user.ID,
		Username:        user.Username,
		DisplayName:     user.DisplayName,
		Email:           user.Email,
		Role:            user.Role,
		Permissions:     rolePermissions(user.Role),
		Rating:          user.Rating,
		Bio:             user.Bio,
		IconURL:         nullString(user.IconURL),
		IsActive:        user.IsActive,
		EmailVerifiedAt: nullTime(user.EmailVerifiedAt),
		CreatedAt:       user.CreatedAt,
		UpdatedAt:       user.UpdatedAt,
	}
}

func rolePermissions(role string) []string {
	permissions := service.RolePermissions[role]
	copied := make([]string, len(permissions))
	copy(copied, permissions)
	return copied
}

type userProfileResponse struct {
	ID          int64     `json:"id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	Role        string    `json:"role"`
	Rating      int       `json:"rating"`
	Bio         string    `json:"bio"`
	IconURL     string    `json:"icon_url,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type currentUserResponse struct {
	ID               int64      `json:"id"`
	Username         string     `json:"username"`
	DisplayName      string     `json:"display_name"`
	Email            string     `json:"email"`
	Role             string     `json:"role"`
	Permissions      []string   `json:"permissions"`
	Rating           int        `json:"rating"`
	SolvedCount      int        `json:"solved_count"`
	Points           int        `json:"points"`
	SubmissionsCount int        `json:"submissions_count"`
	Bio              string     `json:"bio"`
	IconURL          string     `json:"icon_url,omitempty"`
	IsActive         bool       `json:"is_active"`
	EmailVerifiedAt  *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type adminUserResponse struct {
	ID              int64      `json:"id"`
	Username        string     `json:"username"`
	DisplayName     string     `json:"display_name"`
	Email           string     `json:"email"`
	Role            string     `json:"role"`
	Permissions     []string   `json:"permissions"`
	Rating          int        `json:"rating"`
	Bio             string     `json:"bio"`
	IconURL         string     `json:"icon_url,omitempty"`
	IsActive        bool       `json:"is_active"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type adminRoleRequest struct {
	Role string `json:"role"`
}

type adminActiveRequest struct {
	IsActive *bool `json:"is_active"`
}

type adminPasswordRequest struct {
	Password string `json:"password"`
}
