# ISC_onlinejudge / Wait for Judge

Next.js、Go、PostgreSQL、Judge0 で構成したローカル向けオンラインジャッジです。
ブラウザから問題を解き、提出を作成し、Go の採点 worker が Judge0 に実行を依頼して採点結果を保存します。

この README は、初回起動、ログイン、ユーザー管理、問題作成、採点、開発、トラブルシューティングまでをまとめたルートドキュメントです。各サブディレクトリの補足は [backend/README.md](backend/README.md) と [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md) にあります。

## 目次

- [できること](#できること)
- [技術スタック](#技術スタック)
- [全体構成](#全体構成)
- [ディレクトリ構成](#ディレクトリ構成)
- [必要なもの](#必要なもの)
- [クイックスタート](#クイックスタート)
- [初期アカウントと登録 PIN](#初期アカウントと登録-pin)
- [主要画面](#主要画面)
- [採点の流れ](#採点の流れ)
- [サービスとポート](#サービスとポート)
- [環境変数](#環境変数)
- [API 概要](#api-概要)
- [開発コマンド](#開発コマンド)
- [DB とストレージ](#db-とストレージ)
- [本番風起動と公開](#本番風起動と公開)
- [トラブルシューティング](#トラブルシューティング)
- [セキュリティ注意点](#セキュリティ注意点)

## できること

- ユーザー登録、ログイン、ログアウト
- 登録 PIN による登録制限
- 管理者によるユーザー承認、無効化、パスワード変更
- 問題一覧、問題詳細、コード編集、サンプル実行、提出
- 提出履歴、AC 済み問題、得点、解いた問題数の表示
- 管理者による問題作成、編集、公開、非公開、複製、アーカイブ
- 公開テストケースと hidden テストケースの管理
- Go worker による非同期採点
- Judge0 を使った Python / C++ / JavaScript の実行
- `/playground` で Judge0 に直接試し打ちする開発用ワークベンチ

## 技術スタック

| 領域 | 主な技術 |
| --- | --- |
| Frontend | Next.js 16、React 18、TypeScript、Tailwind CSS、lucide-react |
| Backend API | Go 1.23、net/http、pgx v5、bcrypt |
| Database | PostgreSQL 16.2 |
| Judge | Judge0 1.13.1、Judge0 workers、Redis 7.2 |
| Playground proxy | Python 3.11、Flask、requests、redis-py |
| Infrastructure | Docker Compose |

## 全体構成

```mermaid
graph LR
  Browser["Browser"] --> Web["web: Next.js"]
  Web -->|/api/auth, /api/problems, /api/submissions| Backend["backend_api: Go API"]
  Web -->|/api/proxy/submit, /api/proxy/result| Demo["demo: Flask Judge0 proxy"]
  Web -->|/api/proxy/languages| Judge0["server: Judge0 core"]
  Backend --> AppDB["app_db: PostgreSQL"]
  Backend --> Storage["backend/storage"]
  Backend --> Jobs["judge_jobs"]
  Worker["judge_worker: Go worker"] --> Jobs
  Worker --> AppDB
  Worker --> Storage
  Worker --> Judge0
  Demo --> Judge0
  Demo --> Redis["redis"]
  Judge0 --> JDB["db: Judge0 PostgreSQL"]
  Judge0 --> Redis
  Judge0Workers["workers: Judge0 workers"] --> Judge0
```

責務は次のように分けています。

| 領域 | 役割 |
| --- | --- |
| `frontend/` | Next.js App Router の UI。ブラウザからは同一オリジンの `/api/*` を呼ぶ |
| `backend/` | Go の Web API、DB migration、採点 worker |
| `judge0_flask/` | Judge0 へ直接提出する簡易 proxy。主に `/playground` 用 |
| `judge0/` | Judge0 の設定ファイルと単体起動用 compose |
| `app_db` | 自作オンラインジャッジ用 PostgreSQL |
| `db` | Judge0 専用 PostgreSQL |
| `redis` | Judge0 と Flask demo 用 Redis |

Judge0 用 DB と自作アプリ用 DB は分離しています。`backend/db/migrations` は `app_db` にだけ適用され、Judge0 の `db` には触りません。

## ディレクトリ構成

```text
.
├── backend/
│   ├── cmd/
│   │   ├── api/            Go HTTP API
│   │   ├── judge-worker/   採点 worker
│   │   └── migrate/        最小 migration runner
│   ├── db/
│   │   ├── migrations/     app_db 用 migration
│   │   └── queries/        sqlc 想定の SQL
│   ├── internal/
│   │   ├── config/         環境変数読み込み
│   │   ├── handler/        HTTP handler、認証 middleware
│   │   ├── judge/          worker、Judge0 sandbox、比較器
│   │   ├── queue/          PostgreSQL queue
│   │   ├── repository/     DB access
│   │   ├── service/        ユースケース
│   │   └── storage/        local storage
│   └── storage/
│       ├── problems/       問題文、サンプル、hidden test
│       └── submissions/    stdout / stderr などの成果物
├── frontend/
│   ├── app/                Next.js pages と route handlers
│   ├── components/         UI components
│   ├── lib/                API client と proxy helper
│   └── public/             静的ファイル
├── judge0/
│   ├── judge0.conf         Judge0 設定
│   └── docker-compose.yml  Judge0 単体起動用
├── judge0_flask/
│   └── app.py              Judge0 proxy / callback / polling demo
├── docker-compose.yml      開発用の全体 compose
├── docker-compose.prod.yml production server 用 override
├── .env.example            手動起動時の環境変数例
└── CGROUP_V1.md            Judge0 / isolate の cgroup v1 メモ
```

## 必要なもの

- Docker
- Docker Compose v2
- Linux 環境を推奨
- Judge0 worker を動かすため、Docker の privileged container が使えること

Judge0 1.13.1 は環境によって cgroup v2 と相性が悪いことがあります。採点時に isolate / cgroup のエラーが出る場合は [CGROUP_V1.md](CGROUP_V1.md) を確認してください。

## クイックスタート

ルートディレクトリで起動します。

```bash
docker compose up -d --build
```

初回は Go image の build、Next.js の `npm install`、Flask container の `pip install` が走るため、少し時間がかかります。

状態確認:

```bash
docker compose ps
docker compose logs -f web backend_api judge_worker server workers demo
```

ブラウザで開きます。

```text
http://localhost:5174
```

停止:

```bash
docker compose down
```

DB volume も含めて初期化したい場合:

```bash
docker compose down -v
```

`down -v` は Judge0 DB、アプリ DB、frontend の node_modules volume も消します。初期データからやり直したい時だけ使ってください。

## 初期アカウントと登録 PIN

初期 migration で管理者ユーザーが作られます。

| 項目 | 値 |
| --- | --- |
| username | `admin` |
| email | `admin@example.com` |
| password | `change-me` |
| role | `admin` |

ログイン後、必要に応じて管理画面からパスワードを変更してください。

新規ユーザー登録には PIN が必要です。開発用 compose の既定値は次です。

```text
1234
```

登録された一般ユーザーは、最初は inactive です。管理者でログインし、`/admin/users` から active にするとログインできるようになります。

## 主要画面

| URL | 内容 |
| --- | --- |
| `/` | `/dashboard` へリダイレクト |
| `/login` | ログイン |
| `/register` | PIN 付きユーザー登録 |
| `/dashboard` | ユーザーの概要、解いた問題、最近の提出 |
| `/problems` | 公開問題一覧 |
| `/problems/[slug]` | 問題詳細、エディタ、サンプル実行、提出 |
| `/profile` | 自分のプロフィールと提出履歴 |
| `/admin` | 管理トップ |
| `/admin/users` | ユーザー承認、無効化、パスワード変更 |
| `/admin/problems` | 問題管理 |
| `/admin/problems/new` | 問題作成 |
| `/admin/problems/[id]/edit` | 問題編集 |
| `/playground` | Judge0 へ直接提出する開発用ワークベンチ |

通常のジャッジ利用は `/problems` から始めます。`/playground` は問題 DB や hidden test を使わず、Judge0 proxy に直接コードを投げる確認用画面です。

## 採点の流れ

1. ユーザーが `/problems/[slug]` で提出します。
2. Next.js Route Handler が Go API の `/api/submissions` へ転送します。
3. Go API は `submissions` に `WJ` の提出を作り、同じ transaction で `judge_jobs` に job を積みます。
4. `judge_worker` が PostgreSQL queue から job を取得します。
5. worker は問題、言語、テストケースを `app_db` から読みます。
6. 入力と正解出力の実体は `backend/storage` から読みます。
7. 各テストケースを Judge0 core API に送ります。
8. Judge0 core / Judge0 workers がコードを実行します。
9. worker は Judge0 の結果を受け取り、期待出力と実出力を比較します。
10. 結果を `submission_results` と `submissions` に保存します。

出力比較は `TokenComparator` です。空白列を `strings.Fields` で正規化して比較するため、末尾改行や連続スペースの差は無視されます。

最初に入っている言語は次の 3 つです。

| language_id | 言語 |
| --- | --- |
| `54` | C++ 17 |
| `63` | JavaScript / Node.js |
| `71` | Python 3 |

初期問題として `abc001_a` が登録されます。公開サンプルと hidden test があり、動作確認に使えます。

提出ステータス:

| Status | 意味 |
| --- | --- |
| `WJ` | Waiting / judging |
| `AC` | Accepted |
| `WA` | Wrong Answer |
| `TLE` | Time Limit Exceeded |
| `MLE` | Memory Limit Exceeded |
| `RE` | Runtime Error |
| `CE` | Compile Error |
| `OLE` | Output Limit Exceeded |
| `IE` | Internal Error |

## サービスとポート

| Compose service | ホスト | コンテナ | 内容 |
| --- | --- | --- | --- |
| `web` | `5174` | `3000` | Next.js UI |
| `backend_api` | `8080` | `8080` | Go API |
| `demo` | `5000` | `5000` | Flask Judge0 proxy |
| `server` | `2359` | `2358` | Judge0 core API |
| `app_db` | `5433` | `5432` | 自作アプリ用 PostgreSQL |
| `db` | なし | `5432` | Judge0 用 PostgreSQL |
| `redis` | なし | `6379` | Judge0 / demo 用 Redis |
| `workers` | なし | なし | Judge0 worker |
| `backend_migrate` | なし | なし | app_db migration |
| `judge_worker` | なし | なし | Go 採点 worker |

ホストから直接 API を叩く場合:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/api/problems
curl http://localhost:8080/api/languages
```

Judge0 core を直接確認する場合:

```bash
curl http://localhost:2359/languages
```

## 環境変数

開発用 `docker-compose.yml` には主要な値を直接書いてあります。手動起動や外部公開をする場合は [.env.example](.env.example) を参考にしてください。

### Next.js / `web`

| 変数 | 既定 / compose 値 | 説明 |
| --- | --- | --- |
| `NODE_ENV` | `development` | 開発 compose では Next.js dev server |
| `NEXT_TELEMETRY_DISABLED` | `1` | Next.js telemetry 無効 |
| `BACKEND_API_URL` | `http://backend_api:8080` | Next.js server から見た Go API |
| `BACKEND_API_TIMEOUT_MS` | `15000` | Go API proxy の timeout |
| `DEMO_URL` | `http://demo:5000` | Flask demo proxy |
| `JUDGE0_URL` | `http://server:2358` | Judge0 core API |
| `APP_REGISTRATION_PIN_CODE` | `1234` | 管理画面の PIN 表示 fallback |

ブラウザから見える URL ではなく、Next.js server process から到達できる URL を設定してください。Docker 内では `backend_api`、`demo`、`server` という service 名を使います。ホストで `npm run dev` する場合は `http://127.0.0.1:8080` や `http://localhost:2359` を使います。

### Go API / `backend_api`

| 変数 | 既定 / compose 値 | 説明 |
| --- | --- | --- |
| `APP_DATABASE_URL` | `postgres://onlinejudge:onlinejudge@app_db:5432/onlinejudge?sslmode=disable` | app_db 接続先 |
| `APP_HTTP_ADDR` | `:8080` | Go API listen address |
| `APP_STORAGE_ROOT` | `/data/storage` | 問題・提出成果物の storage root |
| `APP_REGISTRATION_PIN_CODE` | `1234` | 登録 PIN |
| `SESSION_TTL` | `168h` | session cookie の有効期限 |
| `DEFAULT_JOB_PRIORITY` | `0` | 提出 job の既定 priority |

### Go worker / `judge_worker`

| 変数 | 既定 / compose 値 | 説明 |
| --- | --- | --- |
| `WORKER_ID` | `worker-1` | job lock に使う worker 名 |
| `JOB_POLL_INTERVAL` | `1s` | queue polling 間隔 |
| `JOB_STALE_AFTER` | `10m` | 古い running job を再 queue する閾値 |
| `OUTPUT_LIMIT_BYTES` | `4194304` | stdout/stderr artifact の上限目安 |
| `JUDGE0_URL` | `http://server:2358` | worker から見た Judge0 core |
| `JUDGE0_TIMEOUT` | `30s` | Judge0 HTTP timeout |
| `JUDGE0_POLL_INTERVAL` | `500ms` | Judge0 polling 間隔 |
| `JUDGE0_POLL_ATTEMPTS` | `120` | Judge0 polling 回数 |

### migration / `backend_migrate`

| 変数 | 既定 / compose 値 | 説明 |
| --- | --- | --- |
| `APP_DATABASE_URL` | `postgres://onlinejudge:onlinejudge@app_db:5432/onlinejudge?sslmode=disable` | migration 対象 |
| `MIGRATIONS_DIR` | `/app/db/migrations` | migration SQL directory |

### Flask demo / `demo`

| 変数 | compose 値 | 説明 |
| --- | --- | --- |
| `JUDGE0_URL` | `http://server:2358` | Judge0 core |
| `APP_PUBLIC_URL` | `http://demo:5000` | callback URL 生成用 |
| `ENABLE_CALLBACKS` | `false` | root compose では polling を使用 |
| `REDIS_URL` | `redis://:redis_pass_change_me@redis:6379/0` | token/result 保存先 |
| `JUDGE0_WORKERS` | `8` | Flask 側 background poller 数 |
| `FLASK_HOST` | `0.0.0.0` | listen host |
| `FLASK_PORT` | `5000` | listen port |

### Judge0

Judge0 の詳細設定は [judge0/judge0.conf](judge0/judge0.conf) にあります。Redis/PostgreSQL の接続先、認証 token、callback、実行時間、メモリ、ファイルサイズなどはここで調整します。

## API 概要

画面から使う API は基本的に Next.js の `/api/*` を呼びます。Next.js Route Handler が Cookie を引き継いで Go API または Flask/Judge0 に転送します。

以下の表は Go API が提供している path を中心にまとめています。`web` 側の Route Handler は画面で使っている endpoint から順に実装されているため、すべての backend endpoint が `http://localhost:5174/api/...` から直接開けるとは限りません。確実に backend API を直接確認する場合は `http://localhost:8080` を使ってください。

### 認証とユーザー

| Method | Path | 説明 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | PIN 付きユーザー登録。作成直後は inactive |
| `POST` | `/api/auth/login` | username / email でログイン |
| `POST` | `/api/auth/logout` | ログアウト |
| `GET` | `/api/auth/me` | 現在のユーザー |
| `GET` | `/api/me/profile` | 自分のプロフィール |
| `PATCH` | `/api/me/profile` | 表示名、bio、icon URL 更新 |
| `PATCH` | `/api/me/password` | 自分のパスワード変更 |
| `GET` | `/api/me/submissions` | 自分の提出 |
| `GET` | `/api/users/{username}` | 公開プロフィール |
| `GET` | `/api/users/{username}/submissions` | ユーザー提出 |
| `GET` | `/api/users/{username}/solved` | AC 済み公開問題 |

### 問題と提出

| Method | Path | 説明 |
| --- | --- | --- |
| `GET` | `/api/problems` | 公開問題一覧 |
| `GET` | `/api/problems/{slug}` | 問題詳細と公開サンプル |
| `GET` | `/api/languages` | 有効な言語一覧 |
| `POST` | `/api/submissions` | 提出作成。認証必須 |
| `GET` | `/api/submissions/{id}` | 提出結果と test case 別結果 |

提出例:

```bash
curl -i -c cookies.txt -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identity":"admin@example.com","password":"change-me"}'

curl -b cookies.txt -X POST http://localhost:8080/api/submissions \
  -H 'Content-Type: application/json' \
  -d '{
    "problem_slug": "abc001_a",
    "language_id": 71,
    "source_code": "h1, h2 = map(int, input().split())\nprint(h1 - h2)\n"
  }'
```

返ってきた `id` を使って結果を確認します。

```bash
curl -b cookies.txt http://localhost:8080/api/submissions/1
```

### 管理 API

管理 API は `admin` role または必要 permission を持つ role の session が必要です。

| Method | Path | 説明 |
| --- | --- | --- |
| `GET` | `/api/admin/registration-pin` | 登録 PIN |
| `GET` | `/api/admin/users` | ユーザー一覧 |
| `GET` | `/api/admin/users/{id}` | ユーザー詳細 |
| `PATCH` | `/api/admin/users/{id}/active` | active / inactive 切り替え |
| `PATCH` | `/api/admin/users/{id}/role` | role 変更 |
| `POST` | `/api/admin/users/{id}/password` | 管理者によるパスワード変更 |
| `DELETE` | `/api/admin/users/{id}` | ユーザー無効化 |
| `GET` | `/api/admin/problems` | 管理用問題一覧 |
| `POST` | `/api/admin/problems` | 問題作成 |
| `GET` | `/api/admin/problems/{id}` | 管理用問題詳細 |
| `PATCH` | `/api/admin/problems/{id}` | 問題更新 |
| `POST` | `/api/admin/problems/{id}/publish` | 公開 |
| `POST` | `/api/admin/problems/{id}/unpublish` | 非公開 |
| `POST` | `/api/admin/problems/{id}/archive` | アーカイブ |
| `POST` | `/api/admin/problems/{id}/copy` | 複製 |

問題作成時は draft で保存されます。公開するには、タイトル、slug、問題文、制限値、少なくとも 1 件の公開テストケースが必要です。

問題管理の制約:

- 公開テストケースは最大 3 件
- hidden テストケースは最大 10 件
- 各テストケースは正解出力が必須
- hidden テストケースの score は 0 以上
- 新規作成時は公開状態を ON にできないため、作成後に公開操作を行う

### Judge0 playground proxy

| Method | Path | 転送先 |
| --- | --- | --- |
| `POST` | `/api/proxy/submit` | Flask demo の `/api/submit` |
| `GET` | `/api/proxy/result/{token}` | Flask demo の `/api/result/{token}` |
| `GET` | `/api/proxy/languages` | Judge0 core の `/languages` |

これは `/playground` 用です。通常の問題提出は Go API の `/api/submissions` を使います。

## 開発コマンド

### 全体を Docker Compose で動かす

```bash
docker compose up -d --build
docker compose logs -f web backend_api judge_worker
```

特定サービスだけ再 build:

```bash
docker compose up -d --build backend_api judge_worker
docker compose up -d --build web
```

### frontend をホストで動かす

先に依存サービスを Docker で起動します。

```bash
docker compose up -d app_db backend_migrate backend_api judge_worker server workers db redis demo
```

別 terminal で:

```bash
cd frontend
npm install
BACKEND_API_URL=http://127.0.0.1:8080 \
DEMO_URL=http://127.0.0.1:5000 \
JUDGE0_URL=http://127.0.0.1:2359 \
npm run dev -- --hostname 0.0.0.0 --port 3000
```

開く URL:

```text
http://localhost:3000
```

frontend の主な npm scripts:

```bash
npm run dev
npm run build
npm run start
npm run typecheck
```

### Go backend をホストで動かす

Go がホストに入っている場合の例です。先に app_db と Judge0 を起動します。

```bash
docker compose up -d app_db server workers db redis
```

DB migration:

```bash
cd backend
APP_DATABASE_URL=postgres://onlinejudge:onlinejudge@localhost:5433/onlinejudge?sslmode=disable \
MIGRATIONS_DIR=./db/migrations \
go run ./cmd/migrate
```

API:

```bash
APP_DATABASE_URL=postgres://onlinejudge:onlinejudge@localhost:5433/onlinejudge?sslmode=disable \
APP_HTTP_ADDR=:8080 \
APP_STORAGE_ROOT=./storage \
APP_REGISTRATION_PIN_CODE=1234 \
go run ./cmd/api
```

worker:

```bash
APP_DATABASE_URL=postgres://onlinejudge:onlinejudge@localhost:5433/onlinejudge?sslmode=disable \
APP_STORAGE_ROOT=./storage \
JUDGE0_URL=http://localhost:2359 \
go run ./cmd/judge-worker
```

### Go の整形とテスト

ホストに Go を入れず、Docker の Go image で確認できます。

```bash
make backend-fmt
make backend-test
make backend-tidy
```

中身は `golang:1.23` container で `gofmt`、`go test ./...`、`go mod tidy` を実行します。

## DB とストレージ

### migration

`backend_migrate` が起動時に `backend/db/migrations/*.sql` をファイル名順に適用します。

- 適用済み migration は `schema_migrations` に記録されます。
- `-- +goose Up` から `-- +goose Down` の手前までを実行します。
- rollback runner はありません。
- 適用済みファイルの checksum が変わった場合、既存 schema を維持して log に出します。

既存 migration を書き換えるより、新しい migration file を追加する運用が安全です。

### 初期データ

初期 migration で次が入ります。

- 管理者 `admin`
- 言語 `54` / `63` / `71`
- 問題 `abc001_a`
- `abc001_a` の公開サンプルと hidden test

### storage

Go API と worker は `APP_STORAGE_ROOT` 以下を使います。Docker Compose では `./backend/storage` を `/data/storage` に mount しています。

主な保存先:

```text
backend/storage/problems/
backend/storage/submissions/
```

問題作成画面から登録した test case は、次のような path に保存されます。

```text
backend/storage/problems/<problem_id>/samples/<name>.in
backend/storage/problems/<problem_id>/samples/<name>.out
backend/storage/problems/<problem_id>/tests/<name>.in
backend/storage/problems/<problem_id>/tests/<name>.out
```

DB の `test_cases` にはこの path が保存されます。提出ごとの stdout / stderr などは次の形式で保存されます。

```text
backend/storage/submissions/YYYY/MM/DD/<submission_id>/
```

## 本番風起動と公開

開発用 compose の `web` は Next.js dev server です。Cloudflare Tunnel などで公開する場合は production server で起動してください。

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

公開先は `web` のホスト port です。

```text
http://localhost:5174
```

Cloudflare Tunnel などはこの URL に向けます。dev server のまま公開すると `/_next/webpack-hmr` の WebSocket が 502 になり、ブラウザ console に HMR エラーが出やすくなります。

公開前に必ず次を変更してください。

- 初期管理者パスワード
- `APP_REGISTRATION_PIN_CODE`
- Judge0 の Redis / PostgreSQL password
- 必要なら Judge0 の `AUTHN_TOKEN` / `AUTHZ_TOKEN`
- firewall / reverse proxy 設定

## トラブルシューティング

### `web` が起動しない

ログを確認します。

```bash
docker compose logs -f web
```

依存 package の install や `.next` volume が壊れている場合は、frontend 関連 volume を作り直します。

```bash
docker compose down
docker volume ls | grep frontend
```

必要なら `docker compose down -v` で全 volume を初期化してください。

### ログインできない

- 初期管理者は `admin@example.com` / `change-me` です。
- 一般ユーザーは登録直後 inactive です。管理者で `/admin/users` から active にしてください。
- ログイン失敗が続くと、一時的に `too many login attempts` になります。しばらく待つか container を再起動してください。

### 登録できない

- PIN は `APP_REGISTRATION_PIN_CODE` と一致する必要があります。
- 開発用 compose の既定値は `1234` です。
- username は英数字、underscore、hyphen が使えます。3 文字以上 32 文字以内です。
- password は 8 文字以上です。

### 提出がずっと `WJ` のまま

worker と Judge0 のログを確認します。

```bash
docker compose logs -f judge_worker server workers
```

よく見る点:

- `judge_worker` が起動しているか
- `server` が `http://localhost:2359` で応答するか
- Judge0 worker が cgroup / isolate エラーを出していないか
- `app_db` の `judge_jobs` に job が残っていないか

DB を直接見る例:

```bash
docker compose exec app_db psql -U onlinejudge -d onlinejudge
```

```sql
SELECT id, submission_id, status, attempts, locked_by, locked_at, created_at
FROM judge_jobs
ORDER BY id DESC
LIMIT 20;
```

### Judge0 が cgroup エラーを出す

次のようなログが出る場合があります。

```text
Failed to create control group /sys/fs/cgroup/memory/box-*/
No such file or directory @ rb_sysopen - /box/main.cpp
```

ホストの cgroup が v2 で、Judge0 1.13.1 の isolate が期待する cgroup v1 と合っていない可能性があります。詳しくは [CGROUP_V1.md](CGROUP_V1.md) を見てください。

### backend API が 502 になる

Next.js の `/api/*` は `BACKEND_API_URL` に転送します。

- Docker 内では `http://backend_api:8080`
- ホストで frontend を動かす場合は `http://127.0.0.1:8080`

`web` container の環境変数と `backend_api` の healthcheck を確認してください。

```bash
docker compose ps backend_api
docker compose logs -f backend_api
```

### Flask playground proxy が 502 になる

`/playground` は `DEMO_URL` と `JUDGE0_URL` を使います。

- Docker 内では `DEMO_URL=http://demo:5000`
- Docker 内では `JUDGE0_URL=http://server:2358`
- ホストの frontend では `http://127.0.0.1:5000` と `http://127.0.0.1:2359`

```bash
docker compose logs -f demo server
```

## セキュリティ注意点

この compose は開発用です。外部公開する場合は、最低限次を見直してください。

- 初期管理者 `change-me` は必ず変更する
- 登録 PIN `1234` は必ず変更する
- `judge0/judge0.conf` の Redis / PostgreSQL password を変更する
- Judge0 core API `:2359` を不用意にインターネットへ公開しない
- `app_db` の `:5433` を公開環境で外へ出さない
- Judge0 は untrusted code を実行するため、実運用では専用 host / VM / firewall を使う
- `server` と `workers` は privileged container です。信頼できない環境では特に分離してください
- Cloudflare Tunnel や reverse proxy の前段で HTTPS、アクセス制御、ログ監視を入れる

## 補足ドキュメント

- Go backend: [backend/README.md](backend/README.md)
- Frontend architecture: [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md)
- Judge0 cgroup v1: [CGROUP_V1.md](CGROUP_V1.md)
- 旧通信設計メモ: [通信方法.md](通信方法.md)
