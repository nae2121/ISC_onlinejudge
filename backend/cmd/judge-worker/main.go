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
	worker := &judge.Worker{
		WorkerID:         cfg.WorkerID,
		Store:            store,
		Queue:            queue.NewPostgresQueue(pool),
		Storage:          storage.NewLocalStorage(cfg.StorageRoot),
		Sandbox:          judge.StubSandbox{},
		PollInterval:     cfg.JobPollInterval,
		StaleAfter:       cfg.JobStaleAfter,
		OutputLimitBytes: cfg.OutputLimitBytes,
	}

	log.Printf("judge worker %s started", cfg.WorkerID)
	if err := worker.Run(ctx); err != nil && err != context.Canceled {
		log.Fatalf("worker stopped: %v", err)
	}
}
