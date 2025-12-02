'use client';

import React, { useEffect } from 'react';

declare global {
  interface Window {
    ace?: any;
    editor?: any;
  }
}

const LS_KEY = 'ace_playground_settings_v2';

type PlaygroundSettings = {
  theme?: 'light' | 'dark';
  live?: boolean;
  fontSize?: number;
  languageId?: number;
};

const defaultSettings: PlaygroundSettings = {
  theme: 'light',
  live: false,
  fontSize: 14,
};

const AcePlaygroundPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Ace Editor Playground';

    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });

    const loadSettings = (): PlaygroundSettings => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return { ...defaultSettings };
        const parsed = JSON.parse(raw) as PlaygroundSettings;
        return { ...defaultSettings, ...parsed };
      } catch {
        return { ...defaultSettings };
      }
    };

    const saveSettings = (s: PlaygroundSettings) => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(s));
      } catch {
        // ignore
      }
    };

    const initAceAndUI = () => {
      const editorEl = document.getElementById('editor');
      if (!editorEl || !window.ace) return;

      const ace = window.ace;
      const editor = ace.edit(editorEl);
      window.editor = editor as any;

      // ベース設定
      editor.setTheme('ace/theme/github');
      editor.session.setMode('ace/mode/python');
      editor.setFontSize(14);
      editor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: false,
        enableSnippets: false,
      });

      // language_tools & 簡易コンプリータ
      try {
        const langTools =
          ace.require && ace.require('ace/ext/language_tools');

        if (langTools) {
          const COMMON_KEYWORDS: Record<string, string[]> = {
            common: ['TODO', 'FIXME', 'console', 'log', 'assert', 'async', 'await'],
            python: [
              'def', 'class', 'import', 'from', 'as', 'if', 'elif', 'else', 'for',
              'while', 'try', 'except', 'finally', 'with', 'lambda', 'yield',
              'return', 'global', 'nonlocal', 'True', 'False', 'None', 'print',
            ],
            javascript: [
              'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
              'switch', 'case', 'break', 'continue', 'return', 'async', 'await',
              'class', 'new', 'this', 'console', 'log', 'import', 'from', 'export',
              'default',
            ],
          };

          const modeIdFromSession = (session: any): string => {
            try {
              const id = session.getMode && session.getMode().$id;
              if (!id) return '';
              const parts = String(id).split('/');
              return parts[parts.length - 1] || '';
            } catch {
              return '';
            }
          };

          const genericCompleter = {
            getCompletions(
              _editorInstance: any,
              session: any,
              _pos: any,
              prefix: string,
              callback: (err: any, results: any[]) => void,
            ) {
              try {
                prefix = prefix || '';
                if (!prefix.length) {
                  callback(null, []);
                  return;
                }

                const mode = modeIdFromSession(session) || 'common';
                const kws =
                  COMMON_KEYWORDS[mode] ||
                  COMMON_KEYWORDS.common ||
                  [];
                const results: any[] = [];
                const lowPref = prefix.toLowerCase();

                kws.forEach((w) => {
                  if (String(w).toLowerCase().startsWith(lowPref)) {
                    results.push({
                      caption: w,
                      value: w,
                      meta: 'keyword',
                    });
                  }
                });

                // buffer からも単語を拾う
                const docWords: Record<string, true> = {};
                const text = session.getValue ? session.getValue() : '';
                const matches =
                  text.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [];
                matches.forEach((w: string) => {
                  if (
                    w.length >= prefix.length &&
                    w.toLowerCase().startsWith(lowPref)
                  ) {
                    docWords[w] = true;
                  }
                });

                Object.keys(docWords).forEach((w) => {
                  if (!results.find((r) => r.value === w)) {
                    results.push({
                      caption: w,
                      value: w,
                      meta: 'buffer',
                    });
                  }
                });

                callback(null, results);
              } catch (err) {
                callback(err, []);
              }
            },
          };

          langTools.addCompleter(genericCompleter);
        }
      } catch (e) {
        console.warn('language_tools init failed:', e);
      }

      // UI 要素を取得
      const modeSelect = document.getElementById(
        'mode',
      ) as HTMLSelectElement | null;
      const runBtn = document.getElementById(
        'runBtn',
      ) as HTMLButtonElement | null;
      const stdinEl = document.getElementById(
        'stdin',
      ) as HTMLTextAreaElement | null;
      const stdoutEl = document.getElementById(
        'stdout',
      ) as HTMLTextAreaElement | null;
      const liveToggle = document.getElementById(
        'liveToggle',
      ) as HTMLInputElement | null;
      const fontSizeRange = document.getElementById(
        'fontSize',
      ) as HTMLInputElement | null;
      const fontSizeValue = document.getElementById(
        'fontSizeValue',
      ) as HTMLSpanElement | null;
      const themeBtns = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.theme-btn'),
      );

      // 設定ロード & 反映
      const settings = loadSettings();

      // テーマ
      if (settings.theme === 'dark') {
        document.body.classList.add('dark');
        editor.setTheme('ace/theme/monokai');
      } else {
        document.body.classList.remove('dark');
        editor.setTheme('ace/theme/github');
      }

      // live 補完
      if (typeof settings.live === 'boolean') {
        if (liveToggle) liveToggle.checked = settings.live;
        editor.setOptions({
          enableLiveAutocompletion: settings.live,
        });
      }

      // フォントサイズ
      if (settings.fontSize && fontSizeRange && fontSizeValue) {
        fontSizeRange.value = String(settings.fontSize);
        fontSizeValue.textContent = String(settings.fontSize);
        editor.setFontSize(settings.fontSize);
      }

      // Judge0 言語取得 & セレクトに詰める
      const guessAceModeFromLangName = (name: string): string => {
        const n = name.toLowerCase();
        if (n.includes('javascript') || n.includes('node')) return 'ace/mode/javascript';
        if (n.includes('typescript')) return 'ace/mode/typescript';
        if (n.includes('python')) return 'ace/mode/python';
        if (n.includes('c++') || n.includes('cpp')) return 'ace/mode/c_cpp';
        if (n === 'c' || n.includes('c (')) return 'ace/mode/c_cpp';
        if (n.includes('c#') || n.includes('csharp')) return 'ace/mode/csharp';
        if (n.includes('java')) return 'ace/mode/java';
        if (n.includes('go') || n.includes('golang')) return 'ace/mode/golang';
        if (n.includes('ruby')) return 'ace/mode/ruby';
        if (n.includes('php')) return 'ace/mode/php';
        if (n.includes('rust')) return 'ace/mode/rust';
        if (n.includes('swift')) return 'ace/mode/swift';
        if (n.includes('html') || n.includes('xml')) return 'ace/mode/html';
        if (n.includes('css')) return 'ace/mode/css';
        if (n.includes('sql')) return 'ace/mode/sql';
        return 'ace/mode/text';
      };

      const loadLanguages = async () => {
        if (!modeSelect) return;
        try {
          const resp = await fetch('/api/proxy/languages');
          if (!resp.ok) throw new Error(String(resp.status));
          const langs = await resp.json();
          if (!Array.isArray(langs)) return;

          // ソート
          langs.sort((a: any, b: any) =>
            String(a.name || '').localeCompare(String(b.name || '')),
          );

          modeSelect.innerHTML = '';

          langs.forEach((l: any) => {
            const opt = document.createElement('option');
            const idVal =
              l.id ?? l.language_id ?? l.languageId ?? l.language_id;
            opt.value = String(idVal ?? '');
            const namePart = l.name || l.language || '';
            const verPart = l.version ? ` ${l.version}` : '';
            opt.textContent = `${namePart}${verPart}${
              idVal ? ` (${idVal})` : ''
            }`;
            opt.dataset.aceMode = guessAceModeFromLangName(
              namePart || '',
            );
            modeSelect.appendChild(opt);
          });

          if (settings.languageId != null) {
            // 前回選択していた ID を指定
            const v = String(settings.languageId);
            const has = Array.from(modeSelect.options).some(
              (o) => o.value === v,
            );
            if (has) {
              modeSelect.value = v;
              const selected =
                modeSelect.options[modeSelect.selectedIndex];
              const aceMode =
                selected.dataset.aceMode ?? 'ace/mode/text';
              editor.session.setMode(aceMode);
            }
          }
        } catch (e) {
          console.error('languages fetch failed:', e);
        }
      };

      loadLanguages();

      // イベントハンドラ
      // テーマボタン
      themeBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const theme = btn.getAttribute('data-theme') as
            | 'light'
            | 'dark'
            | null;
          if (!theme) return;

          if (theme === 'dark') {
            document.body.classList.add('dark');
            editor.setTheme('ace/theme/monokai');
          } else {
            document.body.classList.remove('dark');
            editor.setTheme('ace/theme/github');
          }

          const newSettings: PlaygroundSettings = {
            ...settings,
            theme,
          };
          saveSettings(newSettings);
        });
      });

      // live toggle
      if (liveToggle) {
        liveToggle.addEventListener('change', () => {
          const enabled = liveToggle.checked;
          editor.setOptions({
            enableLiveAutocompletion: enabled,
          });
          const newSettings: PlaygroundSettings = {
            ...settings,
            live: enabled,
          };
          saveSettings(newSettings);
        });
      }

      // font size
      if (fontSizeRange && fontSizeValue) {
        fontSizeRange.addEventListener('input', () => {
          const size = parseInt(fontSizeRange.value, 10) || 14;
          fontSizeValue.textContent = String(size);
          editor.setFontSize(size);
          const newSettings: PlaygroundSettings = {
            ...settings,
            fontSize: size,
          };
          saveSettings(newSettings);
        });
      }

      // 言語変更
      if (modeSelect) {
        modeSelect.addEventListener('change', () => {
          const sel = modeSelect.options[modeSelect.selectedIndex];
          const aceMode = sel.dataset.aceMode ?? 'ace/mode/text';
          editor.session.setMode(aceMode);

          const langId = parseInt(modeSelect.value, 10);
          const newSettings: PlaygroundSettings = {
            ...settings,
            languageId: isNaN(langId) ? undefined : langId,
          };
          saveSettings(newSettings);
        });
      }

      // Ctrl+Enter / Cmd+Enter で実行
      try {
        editor.commands.addCommand({
          name: 'runShortcut',
          bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
          exec: () => {
            if (runBtn && !runBtn.disabled) {
              runBtn.click();
            }
          },
          readOnly: true,
        });
      } catch (e) {
        console.warn('run shortcut register failed:', e);
      }

      // 実行ボタン
      if (runBtn && stdoutEl) {
        runBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          if (!stdoutEl) return;

          const src = editor.getValue();
          const stdin = stdinEl?.value ?? '';

          runBtn.disabled = true;
          const prevText = runBtn.textContent;
          runBtn.textContent = '送信中…';
          stdoutEl.value = '送信中…';

          const pollIntervalMs = 1000;
          const maxAttempts = 120;

          try {
            // 送信
            const resp = await fetch('/api/proxy/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                language_id: settings.languageId ?? 71, // デフォルト: Python
                source_code: src,
                stdin,
              }),
            });

            if (!resp.ok) {
              const txt = await resp
                .text()
                .catch(() => '');
              throw new Error(
                `送信失敗: ${resp.status} ${txt}`,
              );
            }

            const res = await resp.json();
            const token: string | undefined =
              res?.token ?? res?.result?.token;

            const decodeResult = (r: any): string => {
              const stdout = r?.stdout ?? '';
              const stderr = r?.stderr ?? '';
              const compile = r?.compile_output ?? '';
              let out = stdout || '';
              if (compile) {
                out =
                  compile + (out ? `\n\n${out}` : '');
              }
              if (stderr) {
                out +=
                  (out ? '\n\n' : '') +
                  'stderr:\n' +
                  stderr;
              }
              return out || '[空の出力]';
            };

            if (!token) {
              // wait=true などで即結果のパターン
              if (res && res.result) {
                stdoutEl.value = decodeResult(res.result);
              } else {
                stdoutEl.value = JSON.stringify(res, null, 2);
              }
              return;
            }

            // ポーリング
            stdoutEl.value = `トークン: ${token}\nポーリング中...`;
            const pollUrl = `/api/proxy/result/${encodeURIComponent(
              token,
            )}`;
            let result: any = null;

            for (let i = 0; i < maxAttempts; i++) {
              const r2 = await fetch(pollUrl);
              if (!r2.ok) {
                stdoutEl.value = `ポーリング失敗: ${r2.status}`;
                break;
              }
              const rj = await r2.json();
              const done =
                rj.done !== undefined
                  ? rj.done
                  : rj.status?.id && rj.status.id > 2;
              const resObj = rj.result ?? rj;

              if (done) {
                result = resObj;
                break;
              } else {
                const desc =
                  resObj.status?.description ?? '実行中...';
                stdoutEl.value = `処理中: ${desc}`;
              }

              // wait
              // eslint-disable-next-line no-await-in-loop
              await new Promise((resolve) =>
                setTimeout(resolve, pollIntervalMs),
              );
            }

            if (result) {
              stdoutEl.value = decodeResult(result);
            } else if (!stdoutEl.value) {
              stdoutEl.value =
                'タイムアウト: 結果取得できず';
            }
          } catch (err: any) {
            stdoutEl.value = `実行エラー: ${
              err?.message ?? String(err)
            }\n\nブラウザの Network/Console を確認してください（CORS など）。`;
          } finally {
            runBtn.disabled = false;
            runBtn.textContent = prevText ?? '実行';
          }
        });
      }
    };

    // Ace 本体と language_tools をロードしてから初期化
    (async () => {
      try {
        await loadScript(
          'https://cdnjs.cloudflare.com/ajax/libs/ace/1.16.0/ace.js',
        );
        await loadScript(
          'https://cdnjs.cloudflare.com/ajax/libs/ace/1.16.0/ext-language_tools.js',
        );
        initAceAndUI();
      } catch (e) {
        console.error('Ace load/init failed:', e);
      }
    })();

    // クリーンアップ（エディタ破棄）
    return () => {
      if (window.editor && typeof window.editor.destroy === 'function') {
        window.editor.destroy();
      }
      window.editor = undefined;
    };
  }, []);

  return (
    <>
      <div className="topbar">
        <button id="homeBtn" className="tab-button">
          Home
        </button>

        <div
          className="language-selector"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <label htmlFor="mode">Language:</label>
          <select id="mode">
            <option value="">Loading languages…</option>
          </select>
        </div>

        <div style={{ flex: 1 }} />

        <button
          id="runBtn"
          className="tab-button"
          data-disabled="true"
          title="Judge0 に送信して実行"
          style={{ opacity: 0.95 }}
        >
          実行
        </button>

        <button id="settingsBtn" className="tab-button">
          Settings
        </button>
      </div>

      <div className="workspace">
        {/* left: Problem */}
        <div className="left-panel" id="leftPanel">
          <div className="panel-header">
            <strong>Problem</strong>
            <button
              className="minimize"
              data-target="leftPanel"
              title="Minimize left"
            >
              −
            </button>
          </div>
          <div id="problemBody" className="panel-content">
            ここに課題文が表示されます。
          </div>
        </div>

        <div className="col-resizer" id="resizer" title="Resize left" />

        {/* center: Ace editor */}
        <div className="center-panel">
          <div id="editor">// Ace editor</div>
        </div>

        <div className="col-resizer" id="resizer2" title="Resize right" />

        {/* right: IO */}
        <div className="right-panel" id="rightPanel">
          <div className="panel-header">
            <strong>IO</strong>
            <button
              className="minimize"
              data-target="rightPanel"
              title="Minimize right"
            >
              −
            </button>
          </div>

          <div className="io-container">
            {/* Input */}
            <div
              id="inputSection"
              className="io-section"
              style={{
                flex: '0 0 220px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                className="panel-header"
                style={{
                  padding: '8px',
                  borderBottom: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong>Input</strong>
                <button
                  className="io-minimize"
                  data-target="inputSection"
                  title="Minimize Input"
                >
                  −
                </button>
              </div>

              <div
                className="panel-content"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <textarea
                  id="stdin"
                  placeholder="標準入力"
                  style={{
                    flex: 1,
                    height: '100%',
                    overflow: 'auto',
                    minHeight: '140px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div className="io-resizer" id="ioResizer" title="Resize IO" />

            {/* Output */}
            <div
              id="outputSection"
              className="io-section"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                minHeight: 0,
              }}
            >
              <div
                className="panel-header"
                style={{
                  padding: '8px',
                  borderBottom: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong>Output</strong>
                <button
                  className="io-minimize"
                  data-target="outputSection"
                  title="Minimize Output"
                >
                  −
                </button>
              </div>

              <div
                className="panel-content"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                <textarea
                  id="stdout"
                  placeholder="標準出力"
                  readOnly
                  style={{
                    flex: 1,
                    height: '100%',
                    overflow: 'auto',
                    minHeight: 0,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div
        id="modalOverlay"
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
        }}
      />

      {/* Settings モーダル */}
      <div
        id="settingsModal"
        style={{
          display: 'none',
          position: 'fixed',
          left: '50%',
          top: '12%',
          transform: 'translateX(-50%)',
          background: 'var(--panel)',
          padding: '12px',
          borderRadius: '8px',
          zIndex: 1000,
          minWidth: '420px',
          maxHeight: '76vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <strong>Settings</strong>
          <div>
            <button id="closeSettings" className="tab-button">
              ✕
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Editor settings */}
          <div
            style={{
              borderBottom: '1px solid rgba(0,0,0,0.04)',
              paddingBottom: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <label>Theme:</label>
              <button className="theme-btn" data-theme="light">
                Light
              </button>
              <button className="theme-btn" data-theme="dark">
                Dark
              </button>
            </div>

            <div style={{ marginTop: '8px' }}>
              <label>
                <input type="checkbox" id="liveToggle" /> Ace: Live autocomplete
              </label>
            </div>

            <div
              style={{
                marginTop: '8px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <label htmlFor="fontSize">
                Font: <span id="fontSizeValue">14</span>px
              </label>
              <input
                id="fontSize"
                type="range"
                min={12}
                max={24}
                defaultValue={14}
              />
            </div>
          </div>

          {/* Judge0 settings（最低限） */}
          <div id="judge0SettingsSection" style={{ paddingTop: '8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <strong>Judge0 Settings</strong>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                marginBottom: '8px',
              }}
            >
              現状、この UI から変更できる Judge0 設定はありません（language_id
              は上部の Language セレクトに連動します）。
            </div>

            {/* 将来的に細かい設定フィールドを追加するスペース */}
          </div>

          {/* ARTS アイコン */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '12px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <img
              src="/image/ARTS.png"
              alt="ARTS icon"
              style={{
                maxWidth: '160px',
                maxHeight: '80px',
                objectFit: 'contain',
                opacity: 0.95,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default AcePlaygroundPage;
