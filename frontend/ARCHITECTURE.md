# Next.js フロントエンド設計メモ

この `frontend/` ディレクトリは、以前の Flask フロントエンドを Next.js + React に置き換えたものです。`judge0_flask/` は Judge0 と通信する API サーバとして残し、フロントエンド側では UI と同一オリジン proxy だけを担当します。

## 責務分割

- `app/page.tsx`: 画面の入口。重いロジックを持たず、作業画面 component を表示します。
- `components/JudgeWorkbench.tsx`: ブラウザで動く状態を管理します。Ace editor、入力、実行状態、設定 modal、リサイズ UI がここにあります。
- `components/SettingsDialog.tsx`: 設定フォームです。保存先は localStorage ですが、保存の判断は親 component に戻します。
- `components/PaneHeader.tsx`: パネルの見出しと折りたたみボタンです。
- `components/types.ts`: UI 側で共有する小さな型です。
- `app/api/proxy/*/route.ts`: ブラウザから同一オリジンで呼ばれる proxy です。Docker 内部の `demo` / `server` というサービス名をブラウザに見せません。
- `lib/proxy.ts`: proxy の共通処理です。URL 解決、タイムアウト、レスポンス中継、base64 decode をまとめています。

## 設計思想

React 化の目的は「HTML を JSX に写す」ことではなく、画面の状態を明示することです。今回の画面は、主に次の状態で動きます。

- エディタ状態: Ace が持つコード本文、テーマ、フォントサイズ、補完設定
- 実行状態: idle / submitting / polling / done / error
- Judge0 設定: fields、base64、wait、認証用 query
- レイアウト状態: 左右パネル幅、Input 高さ、折りたたみ

状態を分けると、変更の理由が見えやすくなります。例えば `runStatus` は実行ボタンとステータス表示に効きますが、パネル幅には関係しません。この「関係のないものを関係させない」ことが React 設計の基本です。

## Next.js を使う理由

この構成では Next.js の App Router を使っています。UI は React component として書き、API proxy は `app/api/.../route.ts` に置きます。これにより、ブラウザは `/api/proxy/submit` のような同一オリジン URL だけを呼び、サーバ側の Route Handler が Docker ネットワーク内の `http://demo:5000` や `http://server:2358` へ転送します。

## API 契約

既存の Flask proxy と同じ URL を維持しています。

- `POST /api/proxy/submit`
- `GET /api/proxy/languages`
- `GET /api/proxy/result/:token`

URL を維持すると、UI を差し替えても周辺の説明や curl、通信フローを大きく変えずに済みます。

## 今後の分解候補

`JudgeWorkbench.tsx` は画面全体の流れを追いやすいように、実行フローとレイアウト状態をまだ同じ場所に置いています。次に育てるなら、次のように分けると自然です。

- `EditorPane`
- `ProblemPane`
- `IoPane`
- `useJudge0Runner`
- `useResizablePanels`
