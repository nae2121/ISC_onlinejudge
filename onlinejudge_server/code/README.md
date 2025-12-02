# `code/` サービス — 説明と実行方法

このディレクトリはフロントエンドのテンプレートと「同一オリジン proxy」を提供する小さな Flask アプリケーションを含みます。ブラウザは `code` のエンドポイントにアクセスして、内部の `judge0_flask`（demo）や Judge0 core に間接的にアクセスします。

## 役割
- 静的ファイルとテンプレートの配信（`templates/index.html`）
- ブラウザとバックエンド間の同一オリジンプロキシ（`/api/proxy/*`）
- いくつかの応答変換（例: Judge0 の base64 エンコードの自動デコード）

## 依存
- `requirements.txt` に `flask==2.3.3` が記載されています。開発環境では `requests` を入れると HTTP 周りが安定します。

## ローカル実行（開発用）
次の手順でローカル実行できます:

```bash
cd code
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# 任意で requests を入れる
pip install requests
FLASK_APP=app.py FLASK_ENV=development flask run --host=0.0.0.0 --port=5173
```

注意: ローカルで実行するときは `app.py` 内で参照している内部 URL（`http://demo:5000` や `http://server:2358`）が外部に見える形にする必要があります。ローカルで `judge0_flask` を同時に起動する、もしくは `target` を `http://localhost:5000` に書き換えてください。

## エンドポイント（概要）
- `GET /` — `templates/index.html` を返す
- `POST /api/proxy/submit` — ブラウザからの提出を受け取り、`judge0_flask`（http://demo:5000/api/submit）へ転送します
- `GET  /api/proxy/result/<token>` — 指定 token の結果を取得し、JSON 内の `stdout`/`stderr` などを自動でデコードします
- `GET  /api/proxy/languages` — Judge0 の `/languages` を取得して返します

## 簡単な curl サンプル（ローカル proxy 経由）
提出（例、Python）:

```bash
curl -X POST http://localhost:5173/api/proxy/submit \
  -H 'Content-Type: application/json' \
  -d '{"source_code":"print(\"hello\")","language_id":71}'
```

結果取得（token は提出時に返るもの）:

```bash
curl http://localhost:5173/api/proxy/result/<token>
```

言語一覧取得:

```bash
curl http://localhost:5173/api/proxy/languages
```

## 設定のポイント
- `code/app.py` 内の `target` URL は Docker ネットワーク内のサービス名（例: `http://demo:5000`）を向いています。ローカル実行時は `localhost` に変更するか、同じネットワークで `judge0_flask` コンテナを実行してください。
- `requests` がインストールされていると `app.py` は `requests` を優先して使用し、よりシンプルに外部リクエストを扱えます。

## トラブルシューティング
- 502 エラーや接続エラー: `judge0_flask` 側が起動しているか、DNS（サービス名）解決ができているかを確認してください。
- JSON 変換エラー: `Content-Type` ヘッダや送信している JSON の形式を確認してください。

## 追加してほしい情報
もし特定の動作例（例: ステップ毎のログ出力や、カスタム Judge0 設定ファイルの例）を README に載せたい場合、詳細を教えてください。追加でサンプルやスクリプトを作成します。
