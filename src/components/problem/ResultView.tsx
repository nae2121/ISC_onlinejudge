"use client";

import { CheckCircle2, Clock, Cpu, HardDrive, Info } from "lucide-react";
import type { RunResult, SubmitResult } from "@/types/submission";
import { StatusBadge } from "@/components/problem/StatusBadge";

type ResultViewProps = {
  isRunning: boolean;
  runResult: RunResult | null;
  submitResult: SubmitResult | null;
};

export function ResultView({ isRunning, runResult, submitResult }: ResultViewProps) {
  const result = runResult;

  return (
    <section className="flex min-h-52 shrink-0 flex-col border-t border-[#30363d] bg-[#0d1117] p-3 lg:max-h-[44%]">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#e6edf3]">実行結果</h2>
        {isRunning ? (
          <span className="inline-flex items-center gap-2 text-xs text-[#8b949e]">
            <Clock className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            実行中...
          </span>
        ) : result ? (
          <StatusBadge status={result.status} />
        ) : null}
      </div>

      {submitResult ? (
        <div className="mb-3 shrink-0 rounded border border-[#30363d] bg-[#161b22] p-3 text-sm text-[#e6edf3]">
          <div className="flex items-center gap-2">
            {submitResult.status === "AC" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <Info className="h-4 w-4 text-[#8b949e]" aria-hidden="true" />
            )}
            <span>提出 #{submitResult.submissionId}</span>
            <StatusBadge status={submitResult.status} />
          </div>
          <p className="mt-2 text-xs text-[#8b949e]">
            {submitResult.status === "AC"
              ? submitResult.scoreAdded
                ? `${submitResult.score} 点を獲得しました。`
                : "AC済みのため得点は加算されません。"
              : "問題一覧には不正解ステータスを残しません。"}
          </p>
        </div>
      ) : null}

      {result ? (
        <div className="min-h-0 overflow-y-auto pr-1 [scrollbar-color:#30363d_transparent] [scrollbar-width:thin]">
          <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
            <div className="rounded border border-[#30363d] bg-[#161b22] p-2">
              <span className="block text-[#8b949e]">Status</span>
              <strong className="mt-1 block text-[#e6edf3]">{result.status}</strong>
            </div>
            <div className="rounded border border-[#30363d] bg-[#161b22] p-2">
              <span className="flex items-center gap-1 text-[#8b949e]">
                <Cpu className="h-3 w-3" aria-hidden="true" />
                Time
              </span>
              <strong className="mt-1 block text-[#e6edf3]">
                {result.timeMs ? `${result.timeMs} ms` : "-"}
              </strong>
            </div>
            <div className="rounded border border-[#30363d] bg-[#161b22] p-2">
              <span className="flex items-center gap-1 text-[#8b949e]">
                <HardDrive className="h-3 w-3" aria-hidden="true" />
                Memory
              </span>
              <strong className="mt-1 block text-[#e6edf3]">
                {result.memoryKb ? `${result.memoryKb} KB` : "-"}
              </strong>
            </div>
          </div>

          <CodeBlock label="標準出力" value={result.stdout || "(empty)"} />
          {result.stderr ? <CodeBlock label="標準エラー" value={result.stderr} danger /> : null}
          </div>
        </div>
      ) : (
        <div className="rounded border border-[#30363d] bg-[#161b22] p-3 text-sm text-[#8b949e]">
          実行または提出すると、結果がここに表示されます。
        </div>
      )}
    </section>
  );
}

function CodeBlock({ danger, label, value }: { danger?: boolean; label: string; value: string }) {
  return (
    <div>
      <div className={`mb-1 text-xs ${danger ? "text-rose-300" : "text-[#8b949e]"}`}>
        {label}
      </div>
      <pre className="max-h-40 overflow-auto rounded border border-[#30363d] bg-[#010409] p-3 font-mono text-xs leading-5 text-[#e6edf3]">
        {value}
      </pre>
    </div>
  );
}
