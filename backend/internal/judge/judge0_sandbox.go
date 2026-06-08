package judge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"onlinejudge/backend/internal/repository"
)

const judge0ResultFields = "stdout,stderr,compile_output,message,status,time,memory"
const judge0DefaultMaxFileSizeKB = 4096

type Judge0Sandbox struct {
	baseURL         string
	client          *http.Client
	pollInterval    time.Duration
	pollMaxAttempts int
}

type Judge0SandboxConfig struct {
	BaseURL         string
	Timeout         time.Duration
	PollInterval    time.Duration
	PollMaxAttempts int
}

func NewJudge0Sandbox(config Judge0SandboxConfig) *Judge0Sandbox {
	timeout := config.Timeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	pollInterval := config.PollInterval
	if pollInterval <= 0 {
		pollInterval = 500 * time.Millisecond
	}
	pollMaxAttempts := config.PollMaxAttempts
	if pollMaxAttempts <= 0 {
		pollMaxAttempts = 120
	}
	return &Judge0Sandbox{
		baseURL:         strings.TrimRight(config.BaseURL, "/"),
		client:          &http.Client{Timeout: timeout},
		pollInterval:    pollInterval,
		pollMaxAttempts: pollMaxAttempts,
	}
}

func (s *Judge0Sandbox) Compile(ctx context.Context, req CompileRequest) (*CompileResult, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return &CompileResult{
		OK:         true,
		OutputPath: req.SourcePath,
	}, nil
}

func (s *Judge0Sandbox) Run(ctx context.Context, req RunRequest) (*RunResult, error) {
	result, err := s.submit(ctx, req)
	if err != nil {
		return nil, err
	}

	stderr := result.Stderr
	if result.CompileOutput != "" {
		if stderr != "" {
			stderr += "\n"
		}
		stderr += result.CompileOutput
	}

	return &RunResult{
		Status:       judge0Status(result.Status),
		Stdout:       []byte(result.Stdout),
		Stderr:       []byte(stderr),
		TimeMS:       milliseconds(result.Time),
		MemoryKB:     intValue(result.Memory),
		ErrorMessage: result.Message,
	}, nil
}

func (s *Judge0Sandbox) Cleanup(ctx context.Context, workDir string) error {
	return ctx.Err()
}

func (s *Judge0Sandbox) submit(ctx context.Context, req RunRequest) (*judge0SubmissionResponse, error) {
	if s.baseURL == "" {
		return nil, fmt.Errorf("judge0 base URL is empty")
	}

	payload := judge0SubmissionRequest{
		LanguageID: req.Language.ID,
		SourceCode: req.SourceCode,
		Stdin:      string(req.Input),
	}
	if req.TimeLimit > 0 {
		payload.CPUTimeLimit = seconds(req.TimeLimit)
	}
	if req.MemoryLimitKB > 0 {
		payload.MemoryLimit = req.MemoryLimitKB
	}
	if req.OutputLimitBytes > 0 {
		payload.MaxFileSize = minInt(int((req.OutputLimitBytes+1023)/1024), judge0DefaultMaxFileSizeKB)
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	endpoint, err := url.Parse(s.baseURL + "/submissions")
	if err != nil {
		return nil, err
	}
	query := endpoint.Query()
	query.Set("wait", "true")
	query.Set("fields", judge0ResultFields)
	endpoint.RawQuery = query.Encode()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint.String(), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	result, err := decodeJudge0HTTPResponse(resp)
	if err != nil {
		return nil, err
	}
	if result.finished() {
		return &result, nil
	}
	if result.Token == "" {
		return nil, fmt.Errorf("judge0 result is not finished and token is missing")
	}
	return s.poll(ctx, result.Token)
}

func (s *Judge0Sandbox) poll(ctx context.Context, token string) (*judge0SubmissionResponse, error) {
	endpoint, err := url.Parse(s.baseURL + "/submissions/" + url.PathEscape(token))
	if err != nil {
		return nil, err
	}
	query := endpoint.Query()
	query.Set("fields", judge0ResultFields)
	endpoint.RawQuery = query.Encode()

	for attempt := 0; attempt < s.pollMaxAttempts; attempt++ {
		timer := time.NewTimer(s.pollInterval)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil, ctx.Err()
		case <-timer.C:
		}

		httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
		if err != nil {
			return nil, err
		}
		resp, err := s.client.Do(httpReq)
		if err != nil {
			return nil, err
		}
		result, err := decodeJudge0HTTPResponse(resp)
		if err != nil {
			return nil, err
		}
		if result.finished() {
			return &result, nil
		}
	}

	return nil, fmt.Errorf("judge0 result was not ready after %d polls", s.pollMaxAttempts)
}

type judge0SubmissionRequest struct {
	LanguageID   int64   `json:"language_id"`
	SourceCode   string  `json:"source_code"`
	Stdin        string  `json:"stdin"`
	CPUTimeLimit float64 `json:"cpu_time_limit,omitempty"`
	MemoryLimit  int     `json:"memory_limit,omitempty"`
	MaxFileSize  int     `json:"max_file_size,omitempty"`
}

type judge0SubmissionResponse struct {
	Token         string           `json:"token"`
	Stdout        string           `json:"stdout"`
	Stderr        string           `json:"stderr"`
	CompileOutput string           `json:"compile_output"`
	Message       string           `json:"message"`
	Status        judge0StatusInfo `json:"status"`
	Time          json.RawMessage  `json:"time"`
	Memory        json.RawMessage  `json:"memory"`
}

type judge0StatusInfo struct {
	ID          int    `json:"id"`
	Description string `json:"description"`
}

func (r judge0SubmissionResponse) finished() bool {
	return r.Status.ID > 2
}

func decodeJudge0Response(reader io.Reader) (judge0SubmissionResponse, error) {
	var result judge0SubmissionResponse
	decoder := json.NewDecoder(reader)
	if err := decoder.Decode(&result); err != nil {
		return judge0SubmissionResponse{}, err
	}
	return result, nil
}

func decodeJudge0HTTPResponse(resp *http.Response) (judge0SubmissionResponse, error) {
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return judge0SubmissionResponse{}, judge0HTTPError(resp)
	}
	return decodeJudge0Response(resp.Body)
}

func judge0HTTPError(resp *http.Response) error {
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	message := strings.TrimSpace(string(body))
	if message == "" {
		message = resp.Status
	}
	return fmt.Errorf("judge0 request failed: %s", message)
}

func judge0Status(status judge0StatusInfo) string {
	switch status.ID {
	case 3:
		return repository.SubmissionAccepted
	case 4:
		return repository.SubmissionWrongAnswer
	case 5:
		return repository.SubmissionTLE
	case 6:
		return repository.SubmissionCompileError
	case 13, 14:
		return repository.SubmissionInternalErr
	}

	description := strings.ToLower(status.Description)
	switch {
	case strings.Contains(description, "accepted"):
		return repository.SubmissionAccepted
	case strings.Contains(description, "wrong"):
		return repository.SubmissionWrongAnswer
	case strings.Contains(description, "time"):
		return repository.SubmissionTLE
	case strings.Contains(description, "memory"):
		return repository.SubmissionMLE
	case strings.Contains(description, "compilation"):
		return repository.SubmissionCompileError
	case strings.Contains(description, "output"), strings.Contains(description, "sigxfsz"):
		return repository.SubmissionOutputLimit
	case strings.Contains(description, "runtime"):
		return repository.SubmissionRuntimeError
	default:
		return repository.SubmissionInternalErr
	}
}

func seconds(value time.Duration) float64 {
	return float64(value) / float64(time.Second)
}

func milliseconds(value json.RawMessage) int {
	return int(secondsFromRaw(value) * 1000)
}

func secondsFromRaw(value json.RawMessage) float64 {
	var number float64
	if err := json.Unmarshal(value, &number); err == nil {
		return number
	}

	var text string
	if err := json.Unmarshal(value, &text); err == nil {
		var parsed float64
		if _, err := fmt.Sscanf(text, "%f", &parsed); err == nil {
			return parsed
		}
	}
	return 0
}

func intValue(value json.RawMessage) int {
	var number int
	if err := json.Unmarshal(value, &number); err == nil {
		return number
	}

	var text string
	if err := json.Unmarshal(value, &text); err == nil {
		var parsed int
		if _, err := fmt.Sscanf(text, "%d", &parsed); err == nil {
			return parsed
		}
	}
	return 0
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
