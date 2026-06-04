FROM golang:1.23-bookworm AS build

WORKDIR /src

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api
RUN CGO_ENABLED=0 go build -o /out/judge-worker ./cmd/judge-worker
RUN CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate

FROM debian:bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates wget \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /out/api /usr/local/bin/api
COPY --from=build /out/judge-worker /usr/local/bin/judge-worker
COPY --from=build /out/migrate /usr/local/bin/migrate
COPY db/migrations /app/db/migrations

EXPOSE 8080
