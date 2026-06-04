package storage

import (
	"context"
	"io"
)

type Storage interface {
	Read(ctx context.Context, path string) ([]byte, error)
	Write(ctx context.Context, path string, data []byte) error
	Exists(ctx context.Context, path string) (bool, error)
	Delete(ctx context.Context, path string) error
	Open(ctx context.Context, path string) (io.ReadCloser, error)
}
