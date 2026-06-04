# Online Judge Backend

Go + PostgreSQL で作るオンラインジャッジのバックエンドです。

## 設計の中心

- DB はメタ情報、状態、結果を持つ。
- Storage はテストケース、stdout/stderr、checker、validator、画像などの実体ファイルを持つ。
- Web API は提出を受け付け、採点ジョブを `judge_jobs` に積む。
- Judge Worker は `FOR UPDATE SKIP LOCKED` でジョブを 1 件ずつ確保し、採点結果を保存する。
- 実行環境は `judge.Sandbox` interface に切り出してあり、Docker / isolate / 将来の別実装を差し替えられる。
- Judge0 既存 DB は Judge0 専用のままにし、自作アプリの DB は Compose の `app_db` で分離する。

## ディレクトリ

```text
backend/
  cmd/
    api/            HTTP API
    judge-worker/   採点ワーカー
    migrate/        最小 migration runner
  internal/
    handler/        HTTP handler
    service/        ユースケース
    repository/     DB access
    queue/          PostgreSQL queue
    judge/          Worker, sandbox interface, comparator
    storage/        Storage interface and local FS
    config/         env config
  db/
    migrations/     PostgreSQL migrations
    queries/        sqlc 想定の SQL
  storage/
    problems/       問題ファイル、テストケース
    submissions/    stdout/stderr などの実行成果物
```

## DB 分離

ルートの `docker-compose.yml` には Judge0 用の `db` と、自作オンラインジャッジ用の `app_db` があります。
`backend/db/migrations` は `app_db` にだけ適用します。
Judge0 用 DB にはテーブルを追加しません。

## 起動

ルートの `docker-compose.yml` から起動します。

```sh
docker compose up --build app_db backend_migrate backend_api
```

API は `http://localhost:8080` で待ち受けます。

```sh
curl http://localhost:8080/healthz
curl http://localhost:8080/api/problems
curl http://localhost:8080/api/problems/abc001_a
curl http://localhost:8080/api/languages
```

認証 API の例:

```sh
curl -c cookies.txt -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "alice",
    "display_name": "Alice",
    "email": "alice@example.com",
    "password": "change-me-please"
  }'

curl -b cookies.txt http://localhost:8080/api/auth/me

curl -b cookies.txt -X PATCH http://localhost:8080/api/me/profile \
  -H 'Content-Type: application/json' \
  -d '{"display_name":"Alice", "bio":"I like dynamic programming."}'
```

提出 API の例:

```sh
curl -b cookies.txt -X POST http://localhost:8080/api/submissions \
  -H 'Content-Type: application/json' \
  -d '{
    "problem_slug": "abc001_a",
    "language_id": 71,
    "source_code": "h1, h2 = map(int, input().split())\nprint(h1 - h2)\n"
  }'
```

提出の `user_id` は session から決まります。リクエスト body で他ユーザー ID を指定しても使われません。

## Docker で Go を検証する

この環境に Go を直接インストールしなくても、Docker の Go image で検証できます。

```sh
docker run --rm -v "$PWD/backend:/app" -w /app golang:1.23 go test ./...
```

またはルートで:

```sh
make backend-test
```

## 注意

`judge-worker` は構造だけ先に作ってあり、現在の sandbox は `StubSandbox` です。
このまま Worker を起動すると採点ジョブは `IE` になります。

次に決めるべきことは、実行環境を Docker で作るか isolate で作るかです。
Docker は導入しやすい一方で、権限・seccomp・ネットワーク遮断・出力制限を丁寧に設定する必要があります。
isolate は競技プログラミング用途に近いですが、環境構築の前提が少し重くなります。
