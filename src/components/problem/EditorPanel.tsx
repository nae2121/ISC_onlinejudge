"use client";

import { Loader2, Play, RotateCcw, Send, Settings } from "lucide-react";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { SettingsDialog } from "@/components/SettingsDialog";
import type { AppSettings, JudgeSettings, ThemeName } from "@/components/types";

export const cppInitialCode = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    cin >> n;

    vector<long long> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];

    long long ans = 0, cur = 0;
    for (int i = 0; i < n; i++) {
        cur = max(0LL, cur + a[i]);
        ans = max(ans, cur);
    }

    cout << ans << endl;
    return 0;
}`;

const ACE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.16.0";
const APP_SETTINGS_KEY = "ace_playground_settings_v1";
const JUDGE_SETTINGS_KEY = "judge0_settings_v1";

type AceEditor = {
  commands?: {
    addCommand: (command: unknown) => void;
  };
  destroy: () => void;
  getValue: () => string;
  resize: () => void;
  session: {
    getMode?: () => { $id?: string };
    off?: (event: string, callback: () => void) => void;
    on?: (event: string, callback: () => void) => void;
    setMode: (mode: string) => void;
  };
  setFontSize: (size: number) => void;
  setOptions: (options: Record<string, unknown>) => void;
  setTheme: (theme: string) => void;
  setValue: (value: string, cursorPos?: number) => void;
};

type AceNamespace = {
  config?: {
    set: (key: string, value: string) => void;
  };
  edit: (element: HTMLElement) => AceEditor;
};

type JudgeLanguage = {
  id?: number;
  language_id?: number;
  name?: string;
  language?: string;
  version?: string;
};

type EditorPanelProps = {
  code: string;
  isRunning: boolean;
  isSubmitting: boolean;
  judgeSettings: JudgeSettings;
  languageId: number;
  onChangeCode: (code: string) => void;
  onChangeJudgeSettings: (settings: JudgeSettings) => void;
  onChangeLanguage: (languageId: number) => void;
  onRun: () => void;
  onSubmit: () => void;
};

export function EditorPanel({
  code,
  isRunning,
  isSubmitting,
  judgeSettings,
  languageId,
  onChangeCode,
  onChangeJudgeSettings,
  onChangeLanguage,
  onRun,
  onSubmit,
}: EditorPanelProps) {
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AceEditor | null>(null);
  const onChangeCodeRef = useRef(onChangeCode);
  const onRunRef = useRef(onRun);
  const [aceLoaded, setAceLoaded] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [languages, setLanguages] = useState<JudgeLanguage[]>([]);
  const [languageToolsLoaded, setLanguageToolsLoaded] = useState(false);
  const [liveAutocomplete, setLiveAutocomplete] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeName>("dark");

  useEffect(() => {
    onChangeCodeRef.current = onChangeCode;
  }, [onChangeCode]);

  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  useEffect(() => {
    const appSettings = readJson<AppSettings>(APP_SETTINGS_KEY, {});
    setFontSize(typeof appSettings.font === "number" ? appSettings.font : 14);
    setLiveAutocomplete(!!appSettings.live);
    setTheme(resolveInitialTheme(appSettings.theme));
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<ThemeName>).detail;
      if (nextTheme === "dark" || nextTheme === "light") {
        setTheme(nextTheme);
      }
    };

    window.addEventListener("wfj:theme-change", handleThemeChange);
    return () => window.removeEventListener("wfj:theme-change", handleThemeChange);
  }, []);

  useEffect(() => {
    if (window.ace) {
      setAceLoaded(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLanguages() {
      try {
        const response = await fetch("/api/proxy/languages", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`language fetch failed: ${response.status}`);
        }

        const payload = (await response.json()) as JudgeLanguage[];
        const sorted = [...payload].sort((a, b) =>
          languageName(a).localeCompare(languageName(b))
        );
        setLanguages(sorted);

        if (!sorted.some((language) => numericLanguageId(language) === languageId)) {
          const fallback = sorted.find((language) => numericLanguageId(language) === 54) ?? sorted[0];
          const nextId = fallback ? numericLanguageId(fallback) : languageId;
          if (nextId) {
            onChangeLanguage(nextId);
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setLanguages([]);
        }
      }
    }

    loadLanguages();
    return () => controller.abort();
  }, [languageId, onChangeLanguage]);

  const selectedLanguageMeta = useMemo(
    () => languages.find((language) => numericLanguageId(language) === languageId),
    [languageId, languages]
  );
  const aceMode = useMemo(
    () => guessAceModeFromJudge0Name(languageName(selectedLanguageMeta)),
    [selectedLanguageMeta]
  );

  useEffect(() => {
    const ace = window.ace as AceNamespace | undefined;

    if (!aceLoaded || !editorHostRef.current || editorRef.current || !ace) {
      return;
    }

    ace.config?.set("basePath", ACE_CDN);
    ace.config?.set("modePath", ACE_CDN);
    ace.config?.set("themePath", ACE_CDN);

    const editor = ace.edit(editorHostRef.current);
    const handleChange = () => {
      onChangeCodeRef.current(editor.getValue());
    };

    editor.setTheme(theme === "dark" ? "ace/theme/monokai" : "ace/theme/github");
    editor.session.setMode(aceMode);
    editor.setFontSize(fontSize);
    editor.setValue(code, -1);
    editor.setOptions({
      highlightActiveLine: true,
      showPrintMargin: false,
      tabSize: 2,
      useWorker: false,
    });
    editor.commands?.addCommand({
      bindKey: { mac: "Command-Enter", win: "Ctrl-Enter" },
      exec: () => onRunRef.current(),
      name: "runSubmission",
      readOnly: true,
    });
    editor.session.on?.("change", handleChange);

    editorRef.current = editor;

    return () => {
      editor.session.off?.("change", handleChange);
      editor.destroy();
      editorRef.current = null;
    };
  }, [aceLoaded]);

  useEffect(() => {
    editorRef.current?.setTheme(theme === "dark" ? "ace/theme/monokai" : "ace/theme/github");
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (!settingsLoaded) return;
    writeJson<AppSettings>(APP_SETTINGS_KEY, {
      ...readJson<AppSettings>(APP_SETTINGS_KEY, {}),
      theme,
    });
  }, [settingsLoaded, theme]);

  useEffect(() => {
    editorRef.current?.setFontSize(fontSize);
    if (!settingsLoaded) return;
    writeJson<AppSettings>(APP_SETTINGS_KEY, {
      ...readJson<AppSettings>(APP_SETTINGS_KEY, {}),
      font: fontSize,
    });
  }, [fontSize, settingsLoaded]);

  useEffect(() => {
    if (languageToolsLoaded) {
      editorRef.current?.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: liveAutocomplete,
        enableSnippets: false,
      });
    }
    if (!settingsLoaded) return;
    writeJson<AppSettings>(APP_SETTINGS_KEY, {
      ...readJson<AppSettings>(APP_SETTINGS_KEY, {}),
      live: liveAutocomplete,
    });
  }, [languageToolsLoaded, liveAutocomplete, settingsLoaded]);

  useEffect(() => {
    editorRef.current?.session.setMode(aceMode);
  }, [aceMode]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getValue() !== code) {
      editor.setValue(code, -1);
    }
  }, [code]);

  useEffect(() => {
    const id = window.setTimeout(() => editorRef.current?.resize(), 30);
    return () => window.clearTimeout(id);
  });

  useEffect(() => {
    const host = editorHostRef.current;
    if (!host || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      editorRef.current?.resize();
    });
    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  function saveJudgeSettings(nextSettings: JudgeSettings) {
    onChangeJudgeSettings(nextSettings);
    writeJson(JUDGE_SETTINGS_KEY, nextSettings);
    setSettingsOpen(false);
  }

  function handleSetTheme(nextTheme: ThemeName) {
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    writeJson<AppSettings>(APP_SETTINGS_KEY, {
      ...readJson<AppSettings>(APP_SETTINGS_KEY, {}),
      theme: nextTheme,
    });
    window.dispatchEvent(new CustomEvent<ThemeName>("wfj:theme-change", { detail: nextTheme }));
  }

  function handleAceReady() {
    setAceLoaded(true);
  }

  function handleLanguageToolsReady() {
    setLanguageToolsLoaded(true);
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-white dark:bg-[#0d1117]">
      <Script
        src={`${ACE_CDN}/ace.js`}
        strategy="afterInteractive"
        onLoad={handleAceReady}
        onReady={handleAceReady}
      />
      {aceLoaded ? (
        <Script
          src={`${ACE_CDN}/ext-language_tools.js`}
          strategy="afterInteractive"
          onLoad={handleLanguageToolsReady}
          onReady={handleLanguageToolsReady}
        />
      ) : null}
      <div className="flex min-h-11 min-w-0 items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 dark:border-[#30363d] dark:bg-[#161b22]">
        <select
          className="h-8 min-w-0 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-teal-600 dark:border-[#30363d] dark:bg-[#0d1117] dark:text-[#e6edf3] dark:focus:border-blue-500"
          onChange={(event) => onChangeLanguage(Number(event.target.value))}
          value={languageId}
        >
          {languages.length === 0 ? (
            <option value={languageId}>Loading...</option>
          ) : (
            languages.map((language) => (
              <option key={numericLanguageId(language)} value={numericLanguageId(language)}>
                {languageLabel(language)}
              </option>
            ))
          )}
        </select>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            className="inline-flex h-8 items-center gap-2 rounded border border-teal-200 bg-teal-50 px-3 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:cursor-wait disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            disabled={isRunning}
            onClick={onRun}
            type="button"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            {isRunning ? "実行中..." : "実行"}
          </button>
          <button
            className="inline-flex h-8 items-center gap-2 rounded border border-blue-500/30 bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onSubmit}
            type="button"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {isSubmitting ? "提出中..." : "提出"}
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:border-[#30363d] dark:text-[#8b949e] dark:hover:bg-[#21262d] dark:hover:text-[#e6edf3]"
            onClick={() => onChangeCode(cppInitialCode)}
            title="初期コードに戻す"
            type="button"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:border-[#30363d] dark:text-[#8b949e] dark:hover:bg-[#21262d] dark:hover:text-[#e6edf3]"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            type="button"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={editorHostRef} className="absolute inset-0" />
        {!aceLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500 dark:text-[#8b949e]">
            ACE editor loading...
          </div>
        ) : null}
      </div>

      {settingsOpen ? (
        <SettingsDialog
          appSettings={{ fontSize, liveAutocomplete, theme }}
          judgeSettings={judgeSettings}
          onClose={() => setSettingsOpen(false)}
          onSave={saveJudgeSettings}
          onSetFontSize={setFontSize}
          onSetLiveAutocomplete={setLiveAutocomplete}
          onSetTheme={handleSetTheme}
        />
      ) : null}
    </div>
  );
}

function numericLanguageId(language: JudgeLanguage) {
  return Number(language.id ?? language.language_id ?? 0);
}

function languageName(language?: JudgeLanguage) {
  return language?.name ?? language?.language ?? "";
}

function languageLabel(language: JudgeLanguage) {
  const id = numericLanguageId(language);
  const version = language.version ? ` ${language.version}` : "";
  return `${languageName(language)}${version}${id ? ` (${id})` : ""}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the editor usable when localStorage is unavailable.
  }
}

function resolveInitialTheme(theme?: ThemeName): ThemeName {
  if (theme === "dark" || theme === "light") {
    return theme;
  }

  if (typeof window !== "undefined") {
    if (document.documentElement.classList.contains("dark")) {
      return "dark";
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  }

  return "light";
}

function guessAceModeFromJudge0Name(name: string) {
  const n = name.toLowerCase();

  if (n.includes("javascript") || n.includes("node")) return "ace/mode/javascript";
  if (n.includes("typescript")) return "ace/mode/typescript";
  if (n.includes("python")) return "ace/mode/python";
  if (n.includes("c++") || n.includes("cpp")) return "ace/mode/c_cpp";
  if (n === "c" || n.includes("c (")) return "ace/mode/c_cpp";
  if (n.includes("c#") || n.includes("csharp")) return "ace/mode/csharp";
  if (n.includes("java")) return "ace/mode/java";
  if (n.includes("kotlin")) return "ace/mode/kotlin";
  if (n.includes("go") || n.includes("golang")) return "ace/mode/golang";
  if (n.includes("html") || n.includes("xml")) return "ace/mode/html";
  if (n.includes("css")) return "ace/mode/css";
  if (n.includes("ruby")) return "ace/mode/ruby";
  if (n.includes("perl")) return "ace/mode/perl";
  if (n.includes("php")) return "ace/mode/php";
  if (n.includes("lua")) return "ace/mode/lua";
  if (n.includes("bash") || n.includes("shell")) return "ace/mode/sh";
  if (n.includes("rust")) return "ace/mode/rust";
  if (n.includes("swift")) return "ace/mode/swift";
  if (n.includes("scala")) return "ace/mode/scala";
  if (n.includes("haskell")) return "ace/mode/haskell";
  if (n.includes("ocaml")) return "ace/mode/ocaml";
  if (n.includes("sql")) return "ace/mode/sql";
  if (n === "r" || n.includes("r (")) return "ace/mode/r";
  if (n.includes("fortran")) return "ace/mode/fortran";
  if (n.includes("makefile")) return "ace/mode/makefile";
  if (n.includes("assembly") || n.includes("asm")) return "ace/mode/assembly";

  return "ace/mode/text";
}
