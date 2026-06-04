# judge0_flask の使い方（更新済み）

このディレクトリには Judge0 と連携する簡易非同期 Flask デモがあります。
主に次の目的で使います：コード提出 → Judge0 に送信 → 非同期で結果取得（ポーリング or コールバック）。

主なファイル
- デモアプリ: [`judge0_flask/app.py`](judge0_flask/app.py:1)
- テンプレート: [`judge0_flask/templates/status.html`](judge0_flask/templates/status.html:1)
- 並列テスト: [`judge0_flask/concurrency_test.py`](judge0_flask/concurrency_test.py:1)
- 単体テスト: [`judge0_flask/test_run.py`](judge0_flask/test_run.py:1)

前提
- Judge0 が http://localhost:2358 で動作していること（Docker Composeを参照）。Compose 定義: [`judge0-v1.13.1/docker-compose.yml`](judge0-v1.13.1/docker-compose.yml:1)
- Python 3.8+
- 推奨: redis がローカルで動いていると永続化されます（環境変数 REDIS_URL を指定）。

依存インストール:
```bash
pip install flask requests redis
```

Judge0 を起動（Docker Compose）
```bash
docker compose -f judge0-v1.13.1/docker-compose.yml up -d
```

デモの起動
- コールバックを有効にする場合は APP_PUBLIC_URL を外部から到達可能な URL に設定してください（テスト環境では localhost でも可）。
```bash
# コールバック有効（デフォルト true）
JUDGE0_URL=http://localhost:2358 APP_PUBLIC_URL=http://localhost:5000 ENABLE_CALLBACKS=true python3 judge0_flask/app.py

# コールバック無効（ポーリングを使う）
JUDGE0_URL=http://localhost:2358 APP_PUBLIC_URL=http://localhost:5000 ENABLE_CALLBACKS=false python3 judge0_flask/app.py
```

提出（API 経由）
```bash
curl -sS -X POST http://localhost:5000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"language_id":71,"source_code":"print(\"hello\")","stdin":""}' | jq
```

結果取得（デモ経由）
```bash
curl http://localhost:5000/api/result/<token> | jq
```

Judge0 生データ取得（直接）
```bash
curl "http://localhost:2358/submissions/<token>?base64_encoded=true" | jq
```

ログ確認
```bash
docker compose -f judge0-v1.13.1/docker-compose.yml logs -f server
```

注意点・バグ修正済み
- デモは提出時に source_code を base64 エンコードして送信します。また、Judge0 の stdout/stderr は base64 の場合があるため、UI で自動的にデコードして表示する機能を追加しました（`status.html` で `decoded_stdout`/`decoded_stderr` を利用）。
- コールバック受信時のペイロードから token を安全に抽出する処理を実装済み。
- Redis が無い場合はスレッドセーフな in-memory ストアを使用します。

テスト
- 並列テスト（内部 mock または実機 Judge0 に対して）
```bash
python3 judge0_flask/concurrency_test.py
```
- 単体モックテスト
```bash
python3 judge0_flask/test_run.py
```
テストは実行して動作確認済み（concurrency_test が成功することを確認しました）。

トラブルシューティング
- docker compose が使えない場合は環境に合わせて `docker compose` コマンドの代替を使用してください。
- コールバックを使う場合はファイアウォールや NAT により外部からコールバックが届かないことがあります。ローカルテストでは APP_PUBLIC_URL を localhost に設定しても動作します（同じマシン内での POST のため）。
- Judge0 による無限ループや高負荷コードに注意してください。必要に応じて `judge0-v1.13.1/judge0.conf` の制限を確認・調整してください。

以上

## curlでの提出→ポーリング スクリプト

下記は提出してトークンを取得し、結果が完了するまでポーリングするシンプルな bash スクリプトです。デモアプリは [`judge0_flask/app.py`](judge0_flask/app.py:1) の `/api/submit` と `/api/result/<token>` を使用します。

```bash
# bash
#!/usr/bin/env bash
set -euo pipefail

# 環境変数で上書き可能
BASE_URL=${BASE_URL:-http://localhost:5000}
LANG=${LANG:-71}
SRC="${1:-print(\"hello\")}"
STDIN="${2:-}"

# submit
RESP=$(curl -sS -X POST "$BASE_URL/api/submit" \
  -H 'Content-Type: application/json' \
  -d "{\"language_id\":${LANG},\"source_code\":\"${SRC}\",\"stdin\":\"${STDIN}\"}")

TOKEN=$(echo "$RESP" | jq -r .token)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Submit failed: $RESP" >&2
  exit 1
fi

echo "Submitted token: $TOKEN"

# poll
while true; do
  OUT=$(curl -sS "$BASE_URL/api/result/$TOKEN")
  DONE=$(echo "$OUT" | jq -r .done)
  if [ "$DONE" = "true" ]; then
    echo "Result:"
    echo "$OUT" | jq .result
    exit 0
  fi
  sleep 1
done
```

使い方:

```bash
# 実行例（jq が必要）
BASE_URL=http://localhost:5000 ./scripts/submit_and_poll.sh 'print("hello")'
```

備考:
- スクリプトはプロジェクト内に `scripts/submit_and_poll.sh` として保存すると便利です。
- `language_id` は [`judge0_flask/app.py`](judge0_flask/app.py:1) で取得できる Judge0 の言語一覧に依存します（例: 71 = Python3）。
- `jq` がインストールされていることを確認してください（例: `sudo apt install -y jq`）。

## 提出→ポーリング スクリプト（追加）

リポジトリに提出→ポーリングを自動化するスクリプトを追加しました：[`judge0_flask/scripts/submit_and_poll.sh`](judge0_flask/scripts/submit_and_poll.sh:1)

使い方（ローカルでデモを起動している想定）:
```bash
# 実行権を付与
chmod +x judge0_flask/scripts/submit_and_poll.sh

# 実行（デフォルト: BASE_URL=http://localhost:5000, language_id=71）
judge0_flask/scripts/submit_and_poll.sh 'print("hello")'

# 別のホストや言語IDを使う場合
BASE_URL=http://localhost:5000 LANG=71 judge0_flask/scripts/submit_and_poll.sh 'print("hello")'
```

参照:
- デモ本体: [`judge0_flask/app.py`](judge0_flask/app.py:1)
- フォーム: [`judge0_flask/templates/index.html`](judge0_flask/templates/index.html:1)
- ステータス表示: [`judge0_flask/templates/status.html`](judge0_flask/templates/status.html:1)
