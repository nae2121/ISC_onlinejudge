package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"onlinejudge/backend/internal/config"
	"onlinejudge/backend/internal/handler"
	"onlinejudge/backend/internal/repository"
	"onlinejudge/backend/internal/service"
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
	problemService := service.NewProblemService(store)
	submissionService := service.NewSubmissionService(store, cfg.DefaultPriority)
	authService := service.NewAuthService(store, cfg.SessionTTL, cfg.RegistrationPin)
	userService := service.NewUserService(store)
	server := handler.NewServer(problemService, submissionService, authService, userService)

	httpServer := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           server.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("api listening on %s", cfg.HTTPAddr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("http server: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown failed: %v", err)
	}
}
