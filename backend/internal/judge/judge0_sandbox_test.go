package judge

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"onlinejudge/backend/internal/repository"
)

func TestJudge0SandboxRunAccepted(t *testing.T) {
	var payload judge0SubmissionRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/submissions" {
			t.Errorf("unexpected path: %s", r.URL.Path)
			http.Error(w, "unexpected path", http.StatusNotFound)
			return
		}
		if r.URL.Query().Get("wait") != "true" {
			t.Errorf("wait query was not set")
			http.Error(w, "missing wait query", http.StatusBadRequest)
			return
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Errorf("decode payload: %v", err)
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		writeJudge0TestJSON(t, w, map[string]any{
			"stdout": "42\n",
			"status": map[string]any{
				"id":          3,
				"description": "Accepted",
			},
			"time":   "0.004",
			"memory": 2048,
		})
	}))
	defer server.Close()

	sandbox := NewJudge0Sandbox(Judge0SandboxConfig{
		BaseURL: server.URL,
		Timeout: time.Second,
	})
	result, err := sandbox.Run(context.Background(), RunRequest{
		Language:         repository.Language{ID: 71},
		SourceCode:       "print(42)",
		Input:            []byte(""),
		TimeLimit:        2 * time.Second,
		MemoryLimitKB:    64000,
		OutputLimitBytes: 4096,
	})
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}
	if result.Status != repository.SubmissionAccepted {
		t.Fatalf("status = %s, want AC", result.Status)
	}
	if string(result.Stdout) != "42\n" {
		t.Fatalf("stdout = %q", result.Stdout)
	}
	if result.TimeMS != 4 {
		t.Fatalf("time = %dms, want 4ms", result.TimeMS)
	}
	if result.MemoryKB != 2048 {
		t.Fatalf("memory = %dKB, want 2048KB", result.MemoryKB)
	}
	if payload.LanguageID != 71 || payload.SourceCode != "print(42)" {
		t.Fatalf("unexpected payload: %+v", payload)
	}
	if payload.CPUTimeLimit != 2 || payload.MemoryLimit != 64000 || payload.MaxFileSize != 4 {
		t.Fatalf("limits were not forwarded: %+v", payload)
	}
}

func TestJudge0SandboxRunPollsTokenOnlyResponse(t *testing.T) {
	pollCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/submissions":
			writeJudge0TestJSON(t, w, map[string]any{"token": "abc"})
		case "/submissions/abc":
			pollCount++
			writeJudge0TestJSON(t, w, map[string]any{
				"stdout": "ok\n",
				"status": map[string]any{
					"id":          3,
					"description": "Accepted",
				},
			})
		default:
			t.Errorf("unexpected path: %s", r.URL.Path)
			http.Error(w, "unexpected path", http.StatusNotFound)
		}
	}))
	defer server.Close()

	sandbox := NewJudge0Sandbox(Judge0SandboxConfig{
		BaseURL:         server.URL,
		Timeout:         time.Second,
		PollInterval:    time.Nanosecond,
		PollMaxAttempts: 3,
	})
	result, err := sandbox.Run(context.Background(), RunRequest{
		Language:   repository.Language{ID: 71},
		SourceCode: "print('ok')",
	})
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}
	if pollCount != 1 {
		t.Fatalf("poll count = %d, want 1", pollCount)
	}
	if result.Status != repository.SubmissionAccepted {
		t.Fatalf("status = %s, want AC", result.Status)
	}
}

func TestJudge0SandboxCapsMaxFileSize(t *testing.T) {
	var payload judge0SubmissionRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Errorf("decode payload: %v", err)
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		writeJudge0TestJSON(t, w, map[string]any{
			"status": map[string]any{
				"id":          3,
				"description": "Accepted",
			},
		})
	}))
	defer server.Close()

	sandbox := NewJudge0Sandbox(Judge0SandboxConfig{
		BaseURL: server.URL,
		Timeout: time.Second,
	})
	_, err := sandbox.Run(context.Background(), RunRequest{
		Language:         repository.Language{ID: 71},
		SourceCode:       "print('ok')",
		OutputLimitBytes: 16 * 1024 * 1024,
	})
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}
	if payload.MaxFileSize != judge0DefaultMaxFileSizeKB {
		t.Fatalf("max_file_size = %dKB, want %dKB", payload.MaxFileSize, judge0DefaultMaxFileSizeKB)
	}
}

func TestJudge0StatusMapsKnownStatuses(t *testing.T) {
	tests := []struct {
		name        string
		status      judge0StatusInfo
		want        string
	}{
		{
			name:   "in queue",
			status: judge0StatusInfo{ID: 1, Description: "In Queue"},
			want:   repository.SubmissionWaitingJudge,
		},
		{
			name:   "processing",
			status: judge0StatusInfo{ID: 2, Description: "Processing"},
			want:   repository.SubmissionWaitingJudge,
		},
		{
			name:   "output limit",
			status: judge0StatusInfo{ID: 8, Description: "Runtime Error (SIGXFSZ)"},
			want:   repository.SubmissionOutputLimit,
		},
		{
			name:   "runtime error",
			status: judge0StatusInfo{ID: 9, Description: "Runtime Error (SIGFPE)"},
			want:   repository.SubmissionRuntimeError,
		},
		{
			name:   "runtime description without id",
			status: judge0StatusInfo{Description: "Runtime Error (Other)"},
			want:   repository.SubmissionRuntimeError,
		},
		{
			name:   "internal error",
			status: judge0StatusInfo{ID: 13, Description: "Internal Error"},
			want:   repository.SubmissionInternalErr,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := judge0Status(tt.status); got != tt.want {
				t.Fatalf("judge0Status() = %s, want %s", got, tt.want)
			}
		})
	}
}

func writeJudge0TestJSON(t *testing.T, w http.ResponseWriter, payload any) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		t.Fatalf("encode response: %v", err)
	}
}
