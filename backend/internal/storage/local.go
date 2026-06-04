package storage

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
)

var ErrUnsafePath = errors.New("unsafe storage path")

type LocalStorage struct {
	root string
}

func NewLocalStorage(root string) *LocalStorage {
	return &LocalStorage{root: filepath.Clean(root)}
}

func (s *LocalStorage) Read(ctx context.Context, path string) ([]byte, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	fullPath, err := s.fullPath(path)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(fullPath)
}

func (s *LocalStorage) Write(ctx context.Context, path string, data []byte) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	fullPath, err := s.fullPath(path)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}
	return os.WriteFile(fullPath, data, 0644)
}

func (s *LocalStorage) Exists(ctx context.Context, path string) (bool, error) {
	if err := ctx.Err(); err != nil {
		return false, err
	}
	fullPath, err := s.fullPath(path)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(fullPath)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func (s *LocalStorage) Delete(ctx context.Context, path string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	fullPath, err := s.fullPath(path)
	if err != nil {
		return err
	}
	err = os.Remove(fullPath)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func (s *LocalStorage) Open(ctx context.Context, path string) (io.ReadCloser, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	fullPath, err := s.fullPath(path)
	if err != nil {
		return nil, err
	}
	return os.Open(fullPath)
}

func (s *LocalStorage) fullPath(path string) (string, error) {
	cleaned := filepath.Clean("/" + path)
	relative := strings.TrimPrefix(cleaned, string(filepath.Separator))
	if relative == "" || strings.HasPrefix(relative, "..") {
		return "", ErrUnsafePath
	}
	fullPath := filepath.Join(s.root, relative)
	rootWithSep := s.root + string(filepath.Separator)
	if fullPath != s.root && !strings.HasPrefix(fullPath, rootWithSep) {
		return "", ErrUnsafePath
	}
	return fullPath, nil
}
