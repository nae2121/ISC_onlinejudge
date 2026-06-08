"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import { EditorPanel, cppInitialCode } from "@/components/problem/EditorPanel";
import { IOPanel } from "@/components/problem/IOPanel";
import { ProblemHeader } from "@/components/problem/ProblemHeader";
import { ProblemPanel } from "@/components/problem/ProblemPanel";
import type { JudgeSettings } from "@/components/types";
import type { CurrentUser, Problem, Submission } from "@/lib/api";
import { getProblem, getSolvedProblems, getSubmission, submitProblem } from "@/lib/api";
import type { JudgeStatus, RunResult, SubmitResult } from "@/types/submission";

const DEFAULT_CUSTOM_INPUT = "5\n-2 1 -3 4 -1";
const JUDGE_SETTINGS_KEY = "judge0_settings_v1";
const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 120;
const REQUIRED_RESULT_FIELDS = [
  "stdout",
  "stderr",
  "compile_output",
  "status",
  "time",
  "memory",
  "message",
];
const DEFAULT_RESULT_FIELDS = REQUIRED_RESULT_FIELDS.join(",");
const DEFAULT_JUDGE_SETTINGS: JudgeSettings = {
  authnHeader: "X-Auth-Token",
  authnToken: "",
  base64: false,
  fields: DEFAULT_RESULT_FIELDS,
  wait: false,
};

type ProblemWorkspaceProps = {
  slug: string;
  user: CurrentUser;
};

export function ProblemWorkspace({ slug, user }: ProblemWorkspaceProps) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(cppInitialCode);
  const [languageId, setLanguageId] = useState(54);
  const [activeTab, setActiveTab] = useState<"tests" | "custom">("tests");
  const [customInput, setCustomInput] = useState(DEFAULT_CUSTOM_INPUT);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [judgeSettings, setJudgeSettings] = useState<JudgeSettings>(DEFAULT_JUDGE_SETTINGS);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  const samples = problem?.samples ?? [];
  const selectedSample = samples[selectedSampleIndex];

  useEffect(() => {
    setJudgeSettings(readJson<JudgeSettings>(JUDGE_SETTINGS_KEY, DEFAULT_JUDGE_SETTINGS));
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    Promise.all([getProblem(slug), getSolvedProblems(user.username).catch(() => [])])
      .then(([nextProblem, solvedProblems]) => {
        if (ignore) return;
        const solvedKeys = new Set(
          solvedProblems.flatMap((solvedProblem) => [
            solvedProblem.slug,
            solvedProblem.id ? String(solvedProblem.id) : "",
          ])
        );
        setProblem(
          nextProblem
            ? {
                ...nextProblem,
                solved: solvedKeys.has(nextProblem.slug) || solvedKeys.has(String(nextProblem.id)),
              }
            : null
        );
        if (nextProblem?.samples[0]?.input) {
          setCustomInput(nextProblem.samples[0].input);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [slug, user.username]);

  const runInput = useMemo(
    () => (activeTab === "tests" ? selectedSample?.input ?? customInput : customInput),
    [activeTab, customInput, selectedSample]
  );

  const runCode = useCallback(
    async (input: string, expectedOutput?: string) => {
      setIsRunning(true);
      setRunResult(null);

      try {
        const result = await submitAndPollRun({
          code,
          expectedOutput,
          input,
          judgeSettings,
          languageId,
        });
        setRunResult(result);
      } catch (error) {
        setRunResult({
          status: "IE",
          stdout: "",
          stderr: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsRunning(false);
      }
    },
    [code, judgeSettings, languageId]
  );

  const handleSubmit = useCallback(async () => {
    if (!problem) return;
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      let submission = await submitProblem({
        languageId,
        problemId: problem.id || undefined,
        problemSlug: problem.slug,
        sourceCode: code,
      });

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS && submission.status === "WJ"; attempt += 1) {
        await sleep(POLL_INTERVAL_MS);
        submission = await getSubmission(submission.id);
      }

      const status = submissionStatusToJudgeStatus(submission);
      const alreadySolved = !!problem.solved;
      const scoreAdded = status === "AC" && !alreadySolved;

      if (status === "AC") {
        setProblem({ ...problem, solved: true });
      }

      setSubmitResult({
        alreadySolved,
        score: status === "AC" ? problem.score : 0,
        scoreAdded,
        status,
        submissionId: submission.id,
      });
      setRunResult({
        status,
        stdout: "",
        stderr: submission.errorMessage,
        timeMs: submission.maxTimeMs || undefined,
        memoryKb: submission.maxMemoryKb || undefined,
      });
    } catch (error) {
      setSubmitResult({
        alreadySolved: false,
        score: 0,
        scoreAdded: false,
        status: "IE",
        submissionId: 0,
      });
      setRunResult({
        status: "IE",
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [code, languageId, problem]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 text-zinc-950 dark:bg-[#0d1117] dark:text-[#e6edf3]">
      <ProblemHeader problem={problem} user={user} />

      <PanelGroup
        className="min-h-0 flex-1"
        defaultLayout={{ editor: 30, io: 35, problem: 35 }}
        orientation="horizontal"
      >
        <Panel
          className="min-h-0 min-w-0 border-r border-zinc-200 bg-white dark:border-[#30363d] dark:bg-[#0d1117]"
          defaultSize="35%"
          id="problem"
          maxSize="55%"
          minSize="27%"
        >
          <ProblemPanel loading={loading} problem={problem} />
        </Panel>
        <PanelResizeHandle className="w-1 bg-zinc-200 transition-colors hover:bg-teal-500 dark:bg-[#30363d] dark:hover:bg-blue-500" />
        <Panel
          className="min-h-0 min-w-0 bg-white dark:bg-[#0d1117]"
          defaultSize="30%"
          id="editor"
          maxSize="46%"
          minSize="22%"
        >
          <EditorPanel
            code={code}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            judgeSettings={judgeSettings}
            languageId={languageId}
            onChangeCode={setCode}
            onChangeJudgeSettings={setJudgeSettings}
            onChangeLanguage={setLanguageId}
            onRun={() => runCode(runInput, activeTab === "tests" ? selectedSample?.output : undefined)}
            onSubmit={handleSubmit}
          />
        </Panel>
        <PanelResizeHandle className="w-1 bg-zinc-200 transition-colors hover:bg-teal-500 dark:bg-[#30363d] dark:hover:bg-blue-500" />
        <Panel
          className="min-h-0 min-w-0 border-l border-zinc-200 bg-white dark:border-[#30363d] dark:bg-[#0d1117]"
          defaultSize="35%"
          id="io"
          maxSize="55%"
          minSize="27%"
        >
          <IOPanel
            activeTab={activeTab}
            customInput={customInput}
            isRunning={isRunning}
            onChangeCustomInput={setCustomInput}
            onChangeTab={setActiveTab}
            onRunCustom={() => runCode(customInput)}
            onRunSample={() => runCode(selectedSample?.input ?? customInput, selectedSample?.output)}
            onSelectSample={setSelectedSampleIndex}
            runResult={runResult}
            samples={samples}
            selectedSampleIndex={selectedSampleIndex}
            submitResult={submitResult}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}

async function submitAndPollRun({
  code,
  expectedOutput,
  input,
  judgeSettings,
  languageId,
}: {
  code: string;
  expectedOutput?: string;
  input: string;
  judgeSettings: JudgeSettings;
  languageId: number;
}) {
  const normalizedFields = normalizeJudgeFields(judgeSettings.fields);
  const requestPayload: Record<string, unknown> = {
    fields: normalizedFields,
    language_id: languageId,
    source_code: code,
    stdin: input,
  };

  if (judgeSettings.base64) {
    requestPayload.source_code = encodeBase64(code);
    requestPayload.stdin = encodeBase64(input);
    requestPayload.base64EncodedRequest = true;
  }
  if (judgeSettings.wait) requestPayload.wait = true;
  if (judgeSettings.authnHeader && judgeSettings.authnToken) {
    requestPayload.authnHeader = judgeSettings.authnHeader;
    requestPayload.authnToken = judgeSettings.authnToken;
  }

  const response = await fetch("/api/proxy/submit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok) {
    throw new Error(`実行リクエストに失敗しました: ${response.status}`);
  }

  const responsePayload = (await response.json()) as Record<string, unknown>;
  const responseResult = responsePayload.result;
  const token = stringValue(
    responsePayload.token ?? (isRecord(responseResult) ? responseResult.token : undefined)
  );
  let result = isRecord(responseResult) ? responseResult : responsePayload;

  if (!responsePayload.done && token) {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const pollResponse = await fetch(`/api/proxy/result/${encodeURIComponent(token)}`);
      if (!pollResponse.ok) continue;
      const pollPayload = (await pollResponse.json()) as Record<string, unknown>;
      const pollResult = pollPayload.result;
      result = isRecord(pollResult) ? pollResult : pollPayload;
      const statusValue = result.status;
      const statusId = isRecord(statusValue) ? Number(statusValue.id) : undefined;
      const done =
        pollPayload.done !== undefined
          ? !!pollPayload.done
          : typeof statusId === "number" && statusId > 2;
      if (done) break;
    }
  }

  return judge0ResultToRunResult(result, expectedOutput, judgeSettings);
}

function judge0ResultToRunResult(
  value: Record<string, unknown>,
  expectedOutput: string | undefined,
  judgeSettings: JudgeSettings
): RunResult {
  const statusObject = value.status && typeof value.status === "object" && !Array.isArray(value.status)
    ? (value.status as Record<string, unknown>)
    : {};
  const description = typeof statusObject.description === "string" ? statusObject.description : "";
  const forceDecode = !!judgeSettings.base64;
  const stdout = safeDecode(stringValue(value.decoded_stdout ?? value.stdout), forceDecode);
  const stderr = safeDecode(stringValue(value.decoded_stderr ?? value.stderr), forceDecode);
  const compileOutput = safeDecode(
    stringValue(value.decoded_compile_output ?? value.compile_output),
    forceDecode
  );
  const status = expectedOutput && mapJudge0Status(description) === "AC"
    ? stdout.trim() === expectedOutput.trim()
      ? "AC"
      : "WA"
    : mapJudge0Status(description);
  const time = typeof value.time === "number" ? value.time : Number(value.time);

  return {
    status,
    stdout,
    stderr: stderr || compileOutput || stringValue(value.message) || stringValue(value.error),
    timeMs: Number.isFinite(time) ? Math.round(time * 1000) : undefined,
    memoryKb: typeof value.memory === "number" ? value.memory : undefined,
  };
}

function mapJudge0Status(description: string): JudgeStatus {
  const value = description.toLowerCase();
  if (value.includes("accepted")) return "AC";
  if (value.includes("wrong")) return "WA";
  if (value.includes("time")) return "TLE";
  if (value.includes("memory")) return "MLE";
  if (value.includes("compilation")) return "CE";
  if (value.includes("runtime")) return "RE";
  if (value.includes("output")) return "OLE";
  return "IE";
}

function submissionStatusToJudgeStatus(submission: Submission): JudgeStatus {
  if (submission.status === "AC") return "AC";
  if (submission.status === "WA") return "WA";
  if (submission.status === "TLE") return "TLE";
  if (submission.status === "MLE") return "MLE";
  if (submission.status === "RE") return "RE";
  if (submission.status === "CE") return "CE";
  if (submission.status === "OLE") return "OLE";
  return "IE";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function safeDecode(value: string, force = false) {
  if (!value) return "";
  if (!force && !isLikelyBase64(value)) return value;

  try {
    return decodeBase64(value);
  } catch {
    return value;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
