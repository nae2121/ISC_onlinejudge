# `frontend/` - Next.js フロントエンド

このディレクトリは Judge0 demo のブラウザ UI です。以前の Flask テンプレート UI を Next.js + React に置き換えています。

## 役割

- React でエディタ、入出力、設定 modal、パネル操作を表示する
- `/api/proxy/*` の Route Handlers で内部 API へ転送する
- Docker 内部 URL と CORS の問題をブラウザから隠す

## ファイル構成

- `app/page.tsx`: 画面入口
- `components/JudgeWorkbench.tsx`: エディタと実行画面
- `components/SettingsDialog.tsx`: 設定 modal
- `components/PaneHeader.tsx`: パネル見出し
- `app/api/proxy/submit/route.ts`: `demo` への提出 proxy
- `app/api/proxy/result/[token]/route.ts`: 結果取得 proxy
- `app/api/proxy/languages/route.ts`: Judge0 言語一覧 proxy
- `lib/proxy.ts`: proxy 共通処理
- `ARCHITECTURE.md`: 設計メモ

## 開発

```bash
npm install
DEMO_URL=http://localhost:5000 JUDGE0_URL=http://localhost:2359 npm run dev -- --hostname 0.0.0.0 --port 3000
```

Docker Compose ではルートの `docker-compose.yml` から `web` サービスとして起動します。
