"use client";

import {
  Home,
  Loader2,
  Play,
  Settings
} from "lucide-react";
import Script from "next/script";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { PanelHeader, SectionHeader } from "@/components/PaneHeader";
import { SettingsDialog } from "@/components/SettingsDialog";
import type {
  AppSettings,
  JudgeSettings,
  RunStatus,
  ThemeName
} from "@/components/types";

type AceEditor = {
  commands?: {
    addCommand: (command: unknown) => void;
  };
  destroy: () => void;
  getValue: () => string;
  resize: () => void;
  session: {
    getMode?: () => { $id?: string };
    getValue?: () => string;
    setMode: (mode: string) => void;
  };
  setFontSize: (size: number) => void;
  setOptions: (options: Record<string, unknown>) => void;
  setTheme: (theme: string) => void;
  setValue: (value: string, cursorPos?: number) => void;
};

type JudgeLanguage = {
  id?: number;
  language_id?: number;
  name?: string;
  language?: string;
  version?: string;
};

declare global {
  interface Window {
    ace?: {
      config?: {
        set: (key: string, value: string) => void;
      };
      edit: (element: HTMLElement) => AceEditor;
      require?: (moduleName: string) => {
        addCompleter?: (completer: unknown) => void;
      };
    };
  }
}

const ACE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.16.0";
const APP_SETTINGS_KEY = "ace_playground_settings_v1";
const JUDGE_SETTINGS_KEY = "judge0_settings_v1";
const POLL_INTERVAL_MS = 1_000;
const POLL_MAX_ATTEMPTS = 120;
const REQUIRED_RESULT_FIELDS = [
  "stdout",
  "stderr",
  "compile_output",
  "status",
  "message"
];
const DEFAULT_RESULT_FIELDS = REQUIRED_RESULT_FIELDS.join(",");
const MIN_PANEL_WIDTH = 48;
const DEFAULT_LEFT_WIDTH = 288;
const DEFAULT_RIGHT_WIDTH = 332;
const DEFAULT_INPUT_HEIGHT = 220;

const DEFAULT_SOURCE = `
#include <bits/stdc++.h>
using namespace std;

int main() {
  int n;
  cin >> n;
  cout << n << "Hello world" << endl;
  return 0;
}
`;

const PROBLEM_TEXT = `標準入力から1行を受け取り、そのまま標準出力へ表示してください。

入力例
hello

出力例
hello`;

const COMMON_KEYWORDS: Record<string, string[]> = {
  common: ["TODO", "FIXME", "console", "log", "assert", "async", "await"],
  python: [
    "def",
    "class",
    "import",
    "from",
    "as",
    "if",
    "elif",
    "else",
    "for",
    "while",
    "try",
    "except",
    "finally",
    "with",
    "lambda",
    "yield",
    "return",
    "True",
    "False",
    "None",
    "print"
  ],
  javascript: [
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "return",
    "async",
    "await",
    "class",
    "console",
    "log",
    "import",
    "export"
  ],
  java: [
    "public",
    "private",
    "protected",
    "class",
    "interface",
    "extends",
    "implements",
    "static",
    "void",
    "int",
    "long",
    "boolean",
    "return"
  ],
  c_cpp: [
    "int",
    "long",
    "short",
    "char",
    "float",
    "double",
    "struct",
    "typedef",
    "return",
    "if",
    "else",
    "for",
    "while"
  ],
  ruby: ["def", "class", "module", "end", "if", "else", "do", "return"],
  golang: ["package", "import", "func", "var", "const", "type", "return"],
  rust: ["fn", "let", "mut", "struct", "enum", "impl", "trait", "pub", "use"],
  php: ["function", "class", "public", "private", "echo", "return"],
  sql: ["SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "JOIN"]
};

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
    // localStorage can be disabled; the UI should keep working without it.
  }
}

function languageId(language: JudgeLanguage) {
  const id = language.id ?? language.language_id;
  return id === undefined || id === null ? "" : String(id);
}

function languageName(language?: JudgeLanguage) {
  return language?.name ?? language?.language ?? "";
}

function languageLabel(language: JudgeLanguage) {
  const id = languageId(language);
  const version = language.version ? ` ${language.version}` : "";
  return `${languageName(language)}${version}${id ? ` (${id})` : ""}`;
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

function modeToLanguageId(modeValue: string) {
  if (!modeValue) return 71;
  if (modeValue.includes("python")) return 71;
  if (modeValue.includes("c_cpp")) return 54;
  if (modeValue.includes("javascript")) return 63;
  if (modeValue.includes("html")) return 23;
  return 71;
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function decodeBase64(value: string) {
  const compact = value.trim().replace(/\s+/g, "");
  const binary = window.atob(compact);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function isLikelyBase64(value?: string) {
  if (!value) return false;
  const compact = value.trim().replace(/\s+/g, "");
  return compact.length > 0 && compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
}

function safeDecode(value?: string, force = false) {
  if (!value) return "";
  if (!force && !isLikelyBase64(value)) return value;

  try {
    return decodeBase64(value);
  } catch {
    return value;
  }
}

function normalizeJudgeFields(fields?: string) {
  const trimmed = fields?.trim();
  if (trimmed === "*") {
    return trimmed;
  }

  const values = new Set(
    (trimmed ? trimmed.split(",") : [])
      .map((field) => field.trim())
      .filter(Boolean)
  );

  REQUIRED_RESULT_FIELDS.forEach((field) => values.add(field));
  return [...values].join(",");
}

function decodeResultForDisplay(result: Record<string, unknown>, settings: JudgeSettings) {
  const status =
    result.status && typeof result.status === "object" && !Array.isArray(result.status)
      ? (result.status as Record<string, unknown>)
      : {};
  const statusDescription =
    typeof status.description === "string" ? status.description : "";
  const message =
    typeof result.decoded_message === "string"
      ? result.decoded_message
      : typeof result.message === "string"
        ? result.message
        : "";
  const stdout =
    typeof result.decoded_stdout === "string"
      ? result.decoded_stdout
      : typeof result.stdout === "string"
        ? result.stdout
        : "";
  const stderr =
    typeof result.decoded_stderr === "string"
      ? result.decoded_stderr
      : typeof result.stderr === "string"
        ? result.stderr
        : "";
  const compile =
    typeof result.decoded_compile_output === "string"
      ? result.decoded_compile_output
      : typeof result.compile_output === "string"
        ? result.compile_output
        : "";

  const forceDecode = !!settings.base64;
  const decodedCompile = safeDecode(compile, forceDecode);
  const decodedStdout = safeDecode(stdout, forceDecode);
  const decodedMessage = safeDecode(message, forceDecode);
  const parts = [
    statusDescription && statusDescription !== "Accepted"
      ? `status: ${statusDescription}`
      : "",
    decodedMessage ? `message:\n${decodedMessage}` : "",
    decodedCompile ? `compile_output:\n${decodedCompile}` : "",
    decodedStdout
  ].filter(Boolean);
  const decodedStderr = safeDecode(stderr, forceDecode);

  if (decodedStderr) {
    parts.push(`stderr:\n${decodedStderr}`);
  }

  return parts.join("\n\n") || "[空の出力]";
}

function registerGenericCompleter() {
  const langTools = window.ace?.require?.("ace/ext/language_tools");
  if (!langTools?.addCompleter) {
    return;
  }

  langTools.addCompleter({
    getCompletions(
      editor: AceEditor,
      session: AceEditor["session"],
      _pos: unknown,
      prefix: string,
      callback: (error: Error | null, completions: unknown[]) => void
    ) {
      if (!prefix) {
        callback(null, []);
        return;
      }

      const modeId = session.getMode?.().$id ?? "ace/mode/text";
      const mode = modeId.split("/").pop() ?? "common";
      const lowerPrefix = prefix.toLowerCase();
      const keywordMatches = (COMMON_KEYWORDS[mode] ?? COMMON_KEYWORDS.common)
        .filter((word) => word.toLowerCase().startsWith(lowerPrefix))
        .map((word) => ({ caption: word, value: word, meta: "keyword" }));
      const text = session.getValue?.() ?? "";
      const words = new Set(text.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? []);
      const bufferMatches = [...words]
        .filter((word) => word.toLowerCase().startsWith(lowerPrefix))
        .filter((word) => !keywordMatches.some((match) => match.value === word))
        .map((word) => ({ caption: word, value: word, meta: "buffer" }));

      callback(null, [...keywordMatches, ...bufferMatches]);
    }
  });
}

export function JudgeWorkbench() {
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AceEditor | null>(null);
  const completerRegisteredRef = useRef(false);
  const runRef = useRef<() => void>(() => undefined);
  const savedLanguageRef = useRef<string | null>(null);

  const [aceLoaded, setAceLoaded] = useState(false);
  const [languageToolsLoaded, setLanguageToolsLoaded] = useState(false);
  const [languages, setLanguages] = useState<JudgeLanguage[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [theme, setTheme] = useState<ThemeName>("light");
  const [liveAutocomplete, setLiveAutocomplete] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [judgeSettings, setJudgeSettings] = useState<JudgeSettings>({
    authnHeader: "X-Auth-Token",
    authnToken: "",
    base64: false,
    fields: DEFAULT_RESULT_FIELDS,
    wait: false
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stdin, setStdin] = useState("");
  const [stdout, setStdout] = useState("");
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [inputHeight, setInputHeight] = useState(DEFAULT_INPUT_HEIGHT);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [outputCollapsed, setOutputCollapsed] = useState(false);

  const selectedLanguageMeta = useMemo(
    () => languages.find((language) => languageId(language) === selectedLanguage),
    [languages, selectedLanguage]
  );
  const aceMode = useMemo(
    () => guessAceModeFromJudge0Name(languageName(selectedLanguageMeta)),
    [selectedLanguageMeta]
  );

  useEffect(() => {
    const appSettings = readJson<AppSettings>(APP_SETTINGS_KEY, {});
    const persistedJudgeSettings = readJson<JudgeSettings>(JUDGE_SETTINGS_KEY, {
      authnHeader: "X-Auth-Token",
      authnToken: "",
      base64: false,
      fields: DEFAULT_RESULT_FIELDS,
      wait: false
    });

    savedLanguageRef.current = appSettings.languageId ?? appSettings.mode ?? null;
    setTheme(appSettings.theme === "dark" ? "dark" : "light");
    setFontSize(typeof appSettings.font === "number" ? appSettings.font : 14);
    setLiveAutocomplete(!!appSettings.live);
    setJudgeSettings(persistedJudgeSettings);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLanguages() {
      try {
        const response = await fetch("/api/proxy/languages", {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(`言語取得失敗: ${response.status}`);
        }

        const payload = (await response.json()) as JudgeLanguage[];
        const sorted = [...payload].sort((a, b) =>
          languageName(a).localeCompare(languageName(b))
        );
        setLanguages(sorted);

        const saved = savedLanguageRef.current;
        const python = sorted.find((language) => languageId(language) === "71");
        const fallback = python ?? sorted[0];
        const nextLanguage =
          saved && sorted.some((language) => languageId(language) === saved)
            ? saved
            : fallback
              ? languageId(fallback)
              : "";

        setSelectedLanguage(nextLanguage);
      } catch (error) {
        if (!controller.signal.aborted) {
          setStdout(`言語一覧を取得できませんでした: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    loadLanguages();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!aceLoaded || !editorHostRef.current || editorRef.current || !window.ace) {
      return;
    }

    window.ace.config?.set("basePath", ACE_CDN);
    window.ace.config?.set("modePath", ACE_CDN);
    window.ace.config?.set("themePath", ACE_CDN);

    const editor = window.ace.edit(editorHostRef.current);
    editor.setTheme(theme === "dark" ? "ace/theme/monokai" : "ace/theme/github");
    editor.session.setMode(aceMode);
    editor.setFontSize(fontSize);
    editor.setValue(DEFAULT_SOURCE, -1);
    editor.setOptions({
      showPrintMargin: false
    });

    editor.commands?.addCommand({
      bindKey: { mac: "Command-Enter", win: "Ctrl-Enter" },
      exec: () => runRef.current(),
      name: "runSubmission",
      readOnly: true
    });

    editorRef.current = editor;

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [aceLoaded]);

  useEffect(() => {
    if (languageToolsLoaded) {
      if (!completerRegisteredRef.current) {
        registerGenericCompleter();
        completerRegisteredRef.current = true;
      }
      editorRef.current?.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: liveAutocomplete,
        enableSnippets: false
      });
    }
  }, [languageToolsLoaded, liveAutocomplete]);

  useEffect(() => {
    editorRef.current?.setTheme(theme === "dark" ? "ace/theme/monokai" : "ace/theme/github");
    writeJson<AppSettings>(APP_SETTINGS_KEY, {
      ...readJson<AppSettings>(APP_SETTINGS_KEY, {}),
      theme
    });
  }, [theme]);

  useEffect(() => {
    editorRef.current?.setFontSize(fontSize);
    writeJson<AppSettings>(APP_SETTINGS_KEY, {
      ...readJson<AppSettings>(APP_SETTINGS_KEY, {}),
      font: fontSize
    });
  }, [fontSize]);

  useEffect(() => {
    if (languageToolsLoaded) {
      editorRef.current?.setOptions({
        enableLiveAutocompletion: liveAutocomplete
      });
    }
    writeJson<AppSettings>(APP_SETTINGS_KEY, {
      ...readJson<AppSettings>(APP_SETTINGS_KEY, {}),
      live: liveAutocomplete
    });
  }, [languageToolsLoaded, liveAutocomplete]);

  useEffect(() => {
    if (!selectedLanguage) {
      return;
    }

    editorRef.current?.session.setMode(aceMode);
    writeJson<AppSettings>(APP_SETTINGS_KEY, {
      ...readJson<AppSettings>(APP_SETTINGS_KEY, {}),
      languageId: selectedLanguage,
      mode: selectedLanguage
    });
  }, [aceMode, selectedLanguage]);

  useEffect(() => {
    const id = window.setTimeout(() => editorRef.current?.resize(), 20);
    return () => window.clearTimeout(id);
  }, [
    inputCollapsed,
    inputHeight,
    leftCollapsed,
    leftWidth,
    outputCollapsed,
    rightCollapsed,
    rightWidth
  ]);

  const handleRun = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || runStatus === "submitting" || runStatus === "polling") {
      return;
    }

    const sourceCode = editor.getValue();
    const selected = selectedLanguage || aceMode;
    const parsedLanguageId = Number.parseInt(selected, 10);
    const resolvedLanguageId = Number.isFinite(parsedLanguageId)
      ? parsedLanguageId
      : modeToLanguageId(selected);
    const normalizedFields = normalizeJudgeFields(judgeSettings.fields);
    const useSettings =
      judgeSettings.base64 ||
      judgeSettings.wait ||
      !!normalizedFields ||
      !!(judgeSettings.authnHeader && judgeSettings.authnToken);

    const payload: Record<string, unknown> = {
      language_id: resolvedLanguageId,
      source_code: sourceCode,
      stdin
    };

    if (useSettings) {
      if (judgeSettings.base64) {
        payload.source_code = encodeBase64(sourceCode);
        payload.stdin = encodeBase64(stdin);
        payload.base64EncodedRequest = true;
      }
      if (normalizedFields) payload.fields = normalizedFields;
      if (judgeSettings.wait) payload.wait = true;
      if (judgeSettings.authnHeader && judgeSettings.authnToken) {
        payload.authnHeader = judgeSettings.authnHeader;
        payload.authnToken = judgeSettings.authnToken;
      }
    }

    try {
      setRunStatus("submitting");
      setStdout("送信中...");

      const response = await fetch("/api/proxy/submit", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`送信失敗: ${response.status} ${text}`);
      }

      const submitResult = await response.json();
      const immediateResult = submitResult.result ?? submitResult;
      const token = submitResult.token ?? submitResult.result?.token;

      if (submitResult.done && submitResult.result) {
        setStdout(decodeResultForDisplay(immediateResult, judgeSettings));
        setRunStatus("done");
        return;
      }

      if (!token) {
        setStdout(JSON.stringify(submitResult, null, 2));
        setRunStatus("done");
        return;
      }

      setRunStatus("polling");
      setStdout(`トークン: ${token}\nポーリング中...`);

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
        const resultResponse = await fetch(`/api/proxy/result/${encodeURIComponent(token)}`);
        if (!resultResponse.ok) {
          setStdout(`ポーリング失敗: ${resultResponse.status}`);
          await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
          continue;
        }

        const resultPayload = await resultResponse.json();
        if (resultPayload.error) {
          setStdout(`ポーリングエラー: ${resultPayload.error}`);
        }

        const resultObject = resultPayload.result ?? resultPayload;
        const statusId = resultObject.status?.id;
        const done =
          resultPayload.done !== undefined
            ? !!resultPayload.done
            : typeof statusId === "number" && statusId > 2;

        if (done) {
          setStdout(decodeResultForDisplay(resultObject, judgeSettings));
          setRunStatus("done");
          return;
        }

        const description = resultObject.status?.description ?? "実行中...";
        setStdout(`処理中: ${description}`);
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
      }

      setStdout("タイムアウト: 結果取得できず");
      setRunStatus("error");
    } catch (error) {
      setStdout(`実行エラー: ${error instanceof Error ? error.message : String(error)}`);
      setRunStatus("error");
    } finally {
      window.setTimeout(() => editorRef.current?.resize(), 20);
    }
  }, [aceMode, judgeSettings, runStatus, selectedLanguage, stdin]);

  useEffect(() => {
    runRef.current = handleRun;
  }, [handleRun]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key !== "Enter") return;

      const active = document.activeElement;
      const inEditable =
        active?.tagName === "TEXTAREA" ||
        active?.tagName === "INPUT" ||
        active?.classList.contains("ace_text-input");

      if (inEditable) {
        event.preventDefault();
        runRef.current();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function saveJudgeSettings(nextSettings: JudgeSettings) {
    setJudgeSettings(nextSettings);
    writeJson(JUDGE_SETTINGS_KEY, nextSettings);
    setSettingsOpen(false);
  }

  function startColumnResize(
    event: ReactMouseEvent<HTMLDivElement>,
    side: "left" | "right"
  ) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = side === "left" ? leftWidth : rightWidth;

    function onMove(moveEvent: MouseEvent) {
      const delta = moveEvent.clientX - startX;
      const nextWidth = side === "left" ? startWidth + delta : startWidth - delta;
      const maxWidth = Math.max(MIN_PANEL_WIDTH, window.innerWidth * 0.7);
      const clamped = Math.max(MIN_PANEL_WIDTH, Math.min(maxWidth, nextWidth));
      if (side === "left") {
        setLeftWidth(clamped);
      } else {
        setRightWidth(clamped);
      }
    }

    function onUp() {
      document.body.classList.remove("is-resizing");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    document.body.classList.add("is-resizing");
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startIoResize(event: ReactMouseEvent<HTMLDivElement>) {
    if (rightCollapsed || outputCollapsed) {
      return;
    }

    event.preventDefault();
    const startY = event.clientY;
    const startHeight = inputHeight;

    function onMove(moveEvent: MouseEvent) {
      const nextHeight = startHeight + moveEvent.clientY - startY;
      const maxHeight = Math.max(80, window.innerHeight * 0.7);
      setInputHeight(Math.max(48, Math.min(maxHeight, nextHeight)));
    }

    function onUp() {
      document.body.classList.remove("is-resizing");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    document.body.classList.add("is-resizing");
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const isRunning = runStatus === "submitting" || runStatus === "polling";
  const runLabel = runStatus === "submitting" ? "送信中" : runStatus === "polling" ? "実行中" : "実行";
  const statusLabel: Record<RunStatus, string> = {
    done: "完了",
    error: "エラー",
    idle: "待機",
    polling: "実行中",
    submitting: "送信中"
  };

  return (
    <>
      <Script src={`${ACE_CDN}/ace.js`} strategy="afterInteractive" onLoad={() => setAceLoaded(true)} />
      {aceLoaded && (
        <Script
          src={`${ACE_CDN}/ext-language_tools.js`}
          strategy="afterInteractive"
          onLoad={() => setLanguageToolsLoaded(true)}
        />
      )}

      <div className={`workbench ${theme}`}>
        <header className="topbar">
          <button className="iconButton" type="button" title="Home" onClick={() => window.location.assign("/")}>
            <Home size={17} />
          </button>

          <label className="languageSelector">
            <span>Language</span>
            <select
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value)}
            >
              {languages.length === 0 ? (
                <option value="">Loading...</option>
              ) : (
                languages.map((language) => (
                  <option key={languageId(language)} value={languageId(language)}>
                    {languageLabel(language)}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="topbarSpacer" />

          <span className={`statusPill ${runStatus}`}>{statusLabel[runStatus]}</span>
          <button className="runButton" type="button" disabled={isRunning} onClick={handleRun}>
            {isRunning ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
            <span>{runLabel}</span>
          </button>
          <button
            className="iconButton"
            type="button"
            title="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={17} />
          </button>
        </header>

        <main className="workspace">
          <aside
            className={`sidePanel problemPanel ${leftCollapsed ? "collapsed" : ""}`}
            style={{ flexBasis: leftCollapsed ? 40 : leftWidth }}
          >
            <PanelHeader
              collapsed={leftCollapsed}
              label="Problem"
              onToggle={() => setLeftCollapsed((value) => !value)}
            />
            {!leftCollapsed && <pre className="problemBody">{PROBLEM_TEXT}</pre>}
          </aside>

          <div className="colResizer" onMouseDown={(event) => startColumnResize(event, "left")} />

          <section className="centerPanel">
            <div ref={editorHostRef} className="editorHost">
              {!aceLoaded && <div className="editorFallback">Loading editor...</div>}
            </div>
          </section>

          <div className="colResizer" onMouseDown={(event) => startColumnResize(event, "right")} />

          <aside
            className={`sidePanel ioPanel ${rightCollapsed ? "collapsed" : ""}`}
            style={{ flexBasis: rightCollapsed ? 40 : rightWidth }}
          >
            <PanelHeader
              collapsed={rightCollapsed}
              label="IO"
              onToggle={() => setRightCollapsed((value) => !value)}
            />

            {!rightCollapsed && (
              <div className="ioContainer">
                <section
                  className={`ioSection ${inputCollapsed ? "ioCollapsed" : ""}`}
                  style={{ flexBasis: inputCollapsed ? 40 : inputHeight }}
                >
                  <SectionHeader
                    collapsed={inputCollapsed}
                    label="Input"
                    onToggle={() => setInputCollapsed((value) => !value)}
                  />
                  {!inputCollapsed && (
                    <textarea
                      className="ioTextarea"
                      value={stdin}
                      onChange={(event) => setStdin(event.target.value)}
                      placeholder="標準入力"
                    />
                  )}
                </section>

                <div className="ioResizer" onMouseDown={startIoResize} />

                <section className={`ioSection outputSection ${outputCollapsed ? "ioCollapsed" : ""}`}>
                  <SectionHeader
                    collapsed={outputCollapsed}
                    label="Output"
                    onToggle={() => setOutputCollapsed((value) => !value)}
                  />
                  {!outputCollapsed && (
                    <textarea
                      className="ioTextarea outputTextarea"
                      value={stdout}
                      placeholder="標準出力"
                      readOnly
                    />
                  )}
                </section>
              </div>
            )}
          </aside>
        </main>

        {settingsOpen && (
          <SettingsDialog
            appSettings={{ fontSize, liveAutocomplete, theme }}
            judgeSettings={judgeSettings}
            onClose={() => setSettingsOpen(false)}
            onSave={saveJudgeSettings}
            onSetFontSize={setFontSize}
            onSetLiveAutocomplete={setLiveAutocomplete}
            onSetTheme={setTheme}
          />
        )}
      </div>
    </>
  );
}
