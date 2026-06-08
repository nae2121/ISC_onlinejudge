package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"

	"onlinejudge/backend/internal/config"
	"onlinejudge/backend/internal/judge"
	"onlinejudge/backend/internal/queue"
	"onlinejudge/backend/internal/repository"
	"onlinejudge/backend/internal/storage"
)

func main() {
	cfg := config.Load()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer pool.Close()

	store := repository.NewStore(pool)
	objectStorage := storage.NewLocalStorage(cfg.StorageRoot)
	worker := &judge.Worker{
		WorkerID: cfg.WorkerID,
		Store:    store,
		Queue:    queue.NewPostgresQueue(pool),
		Storage:  objectStorage,
		Sandbox: judge.NewJudge0Sandbox(judge.Judge0SandboxConfig{
			BaseURL:         cfg.Judge0URL,
			Timeout:         cfg.Judge0Timeout,
			PollInterval:    cfg.Judge0PollInterval,
			PollMaxAttempts: cfg.Judge0PollAttempts,
		}),
		PollInterval:     cfg.JobPollInterval,
		StaleAfter:       cfg.JobStaleAfter,
		OutputLimitBytes: cfg.OutputLimitBytes,
	}

	log.Printf("judge worker %s started with Judge0 at %s", cfg.WorkerID, cfg.Judge0URL)
	if err := worker.Run(ctx); err != nil && err != context.Canceled {
		log.Fatalf("worker stopped: %v", err)
	}
}
