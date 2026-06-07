package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"

	"onlinejudge/backend/internal/service"
)

func (s *Server) handleAuthRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	result, err := s.auth.Register(r.Context(), service.RegisterInput{
		Username:    req.Username,
		DisplayName: req.displayName(),
		Email:       req.Email,
		Password:    req.Password,
		PinCode:     req.pinCode(),
		UserAgent:   r.UserAgent(),
		IPAddress:   clientIP(r),
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, authResponse{User: toCurrentUserResponse(result.User)})
}

func (s *Server) handleAdminRegistrationPin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"pin_code": s.auth.RegistrationPinCode(),
	})
}

func (s *Server) handleAuthLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	identity := req.Identity
	if identity == "" {
		identity = req.Username
	}
	if identity == "" {
		identity = req.Email
	}

	result, err := s.auth.Login(r.Context(), service.LoginInput{
		Identity:  identity,
		Password:  req.Password,
		UserAgent: r.UserAgent(),
		IPAddress: clientIP(r),
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}

	setSessionCookie(w, result.Token, result.ExpiresAt)
	writeJSON(w, http.StatusOK, authResponse{User: toCurrentUserResponse(result.User)})
}

func (s *Server) handleAuthLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	token, _ := sessionTokenFromRequest(r)
	if err := s.auth.Logout(r.Context(), token); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleAuthMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := currentUserFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	writeJSON(w, http.StatusOK, toCurrentUserResponse(user))
}

func (s *Server) handleMeProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := currentUserFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	if r.Method == http.MethodGet {
		writeJSON(w, http.StatusOK, toCurrentUserResponse(user))
		return
	}

	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req updateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	updated, err := s.users.UpdateProfile(r.Context(), user.ID, service.UpdateProfileInput{
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		IconURL:     req.IconURL,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toCurrentUserResponse(updated))
}

func (s *Server) handleMeSubmissions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := currentUserFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	limit := parseQueryInt(r, "limit", 50)
	submissions, err := s.users.ListSubmissionsByUsername(r.Context(), user.Username, limit)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	resp := make([]submissionResponse, 0, len(submissions))
	for _, submission := range submissions {
		resp = append(resp, toSubmissionResponse(submission, nil))
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleMePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := currentUserFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req updatePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := s.users.UpdatePassword(r.Context(), user.ID, req.CurrentPassword, req.NewPassword); err != nil {
		writeServiceError(w, err)
		return
	}
	if err := s.auth.Logout(r.Context(), mustSessionToken(r)); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func mustSessionToken(r *http.Request) string {
	token, _ := sessionTokenFromRequest(r)
	return token
}

func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		writeError(w, http.StatusNotFound, "not found")
	case errors.Is(err, service.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrInvalidPinCode):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrDuplicateUser):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, service.ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, service.ErrInactiveUser):
		writeError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, service.ErrTooManyLoginAttempts):
		writeError(w, http.StatusTooManyRequests, err.Error())
	case errors.Is(err, service.ErrInvalidSession):
		writeError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, service.ErrUnsupportedRole):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrCurrentPasswordFailed):
		writeError(w, http.StatusUnauthorized, err.Error())
	default:
		writeError(w, http.StatusInternalServerError, err.Error())
	}
}

type registerRequest struct {
	Username         string `json:"username"`
	DisplayName      string `json:"display_name"`
	DisplayNameCamel string `json:"displayName"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	PinCode          string `json:"pin_code"`
	PinCodeCamel     string `json:"pinCode"`
}

func (r registerRequest) displayName() string {
	if r.DisplayName != "" {
		return r.DisplayName
	}
	return r.DisplayNameCamel
}

func (r registerRequest) pinCode() string {
	if r.PinCode != "" {
		return r.PinCode
	}
	return r.PinCodeCamel
}

type loginRequest struct {
	Identity string `json:"identity"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type updateProfileRequest struct {
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	IconURL     *string `json:"icon_url"`
}

type updatePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type authResponse struct {
	User currentUserResponse `json:"user"`
}
