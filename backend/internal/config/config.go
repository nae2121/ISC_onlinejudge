package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	DatabaseURL        string
	HTTPAddr           string
	StorageRoot        string
	Judge0URL          string
	Judge0Timeout      time.Duration
	Judge0PollInterval time.Duration
	Judge0PollAttempts int
	WorkerID           string
	JobPollInterval    time.Duration
	JobStaleAfter      time.Duration
	MigrationsDir      string
	OutputLimitBytes   int64
	DefaultTimeLimit   time.Duration
	DefaultMemoryKB    int
	DefaultPriority    int
	RegistrationPin    string
	SessionTTL         time.Duration
}

func Load() Config {
	return Config{
		DatabaseURL:        env("APP_DATABASE_URL", "postgres://onlinejudge:onlinejudge@localhost:5433/onlinejudge?sslmode=disable"),
		HTTPAddr:           env("APP_HTTP_ADDR", ":8080"),
		StorageRoot:        env("APP_STORAGE_ROOT", "./storage"),
		Judge0URL:          env("JUDGE0_URL", "http://localhost:2359"),
		Judge0Timeout:      durationEnv("JUDGE0_TIMEOUT", 30*time.Second),
		Judge0PollInterval: durationEnv("JUDGE0_POLL_INTERVAL", 500*time.Millisecond),
		Judge0PollAttempts: intEnv("JUDGE0_POLL_ATTEMPTS", 120),
		WorkerID:           env("WORKER_ID", "worker-local"),
		JobPollInterval:    durationEnv("JOB_POLL_INTERVAL", time.Second),
		JobStaleAfter:      durationEnv("JOB_STALE_AFTER", 10*time.Minute),
		MigrationsDir:      env("MIGRATIONS_DIR", "./db/migrations"),
		OutputLimitBytes:   int64Env("OUTPUT_LIMIT_BYTES", 16*1024*1024),
		DefaultTimeLimit:   durationEnv("DEFAULT_TIME_LIMIT", 2*time.Second),
		DefaultMemoryKB:    intEnv("DEFAULT_MEMORY_KB", 256000),
		DefaultPriority:    intEnv("DEFAULT_JOB_PRIORITY", 0),
		RegistrationPin:    env("APP_REGISTRATION_PIN_CODE", "1234"),
		SessionTTL:         durationEnv("SESSION_TTL", 7*24*time.Hour),
	}
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func intEnv(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func int64Env(key string, fallback int64) int64 {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return fallback
	}
	return value
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := time.ParseDuration(raw)
	if err != nil {
		return fallback
	}
	return value
}
