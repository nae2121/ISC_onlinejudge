package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"onlinejudge/backend/internal/config"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("parse db config: %v", err)
	}
	poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer pool.Close()

	if err := ensureSchemaMigrations(ctx, pool); err != nil {
		log.Fatalf("ensure schema_migrations: %v", err)
	}

	files, err := migrationFiles(cfg.MigrationsDir)
	if err != nil {
		log.Fatalf("list migrations: %v", err)
	}

	for _, file := range files {
		if err := applyMigration(ctx, pool, file); err != nil {
			log.Fatalf("apply %s: %v", file, err)
		}
	}
}

func ensureSchemaMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
)`)
	return err
}

func migrationFiles(dir string) ([]string, error) {
	var files []string
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".sql") {
			return nil
		}
		files = append(files, path)
		return nil
	})
	sort.Strings(files)
	return files, err
}

func applyMigration(ctx context.Context, pool *pgxpool.Pool, path string) error {
	filename := filepath.Base(path)
	body, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(body)
	checksum := hex.EncodeToString(sum[:])

	var existing string
	err = pool.QueryRow(ctx, `SELECT checksum FROM schema_migrations WHERE filename = $1`, filename).Scan(&existing)
	if err == nil {
		if existing != checksum {
			log.Printf("migration %s already applied with a different checksum; keeping existing schema", filename)
		}
		return nil
	}
	if err != pgx.ErrNoRows {
		return err
	}

	upSQL := upSection(string(body))
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, upSQL); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
INSERT INTO schema_migrations (filename, checksum)
VALUES ($1, $2)`, filename, checksum); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	log.Printf("applied migration %s", filename)
	return nil
}

func upSection(sql string) string {
	upMarker := "-- +goose Up"
	downMarker := "-- +goose Down"
	if idx := strings.Index(sql, upMarker); idx >= 0 {
		sql = sql[idx+len(upMarker):]
	}
	if idx := strings.Index(sql, downMarker); idx >= 0 {
		sql = sql[:idx]
	}
	return strings.TrimSpace(sql)
}
