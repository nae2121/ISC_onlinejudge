backend-fmt:
	docker run --rm -v "$(PWD)/backend:/app" -w /app golang:1.23 gofmt -w .

backend-test:
	docker run --rm -v "$(PWD)/backend:/app" -w /app golang:1.23 go test ./...

backend-tidy:
	docker run --rm -v "$(PWD)/backend:/app" -w /app golang:1.23 go mod tidy
