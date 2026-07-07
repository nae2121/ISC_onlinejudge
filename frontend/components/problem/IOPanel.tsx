"use client";

import { Loader2, Play } from "lucide-react";
import type { ProblemSample } from "@/lib/api";
import { ResultView } from "@/components/problem/ResultView";
import { SampleCaseAccordion } from "@/components/problem/SampleCaseAccordion";
import type { RunResult, SubmitResult } from "@/types/submission";

type IOPanelProps = {
  activeTab: "tests" | "custom";
  customInput: string;
  isRunning: boolean;
  onChangeCustomInput: (input: string) => void;
  onChangeTab: (tab: "tests" | "custom") => void;
  onRunCustom: () => void;
  onRunSample: () => void;
  onSelectSample: (index: number) => void;
  runResult: RunResult | null;
  samples: ProblemSample[];
  selectedSampleIndex: number;
  submitResult: SubmitResult | null;
};

export function IOPanel({
  activeTab,
  customInput,
  isRunning,
  onChangeCustomInput,
  onChangeTab,
  onRunCustom,
  onRunSample,
  onSelectSample,
  runResult,
  samples,
  selectedSampleIndex,
  submitResult,
}: IOPanelProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-white dark:bg-[#0d1117]">
      <div className="flex min-h-11 items-center border-b border-zinc-200 bg-zinc-50 px-3 dark:border-[#30363d] dark:bg-[#161b22]">
        <button
          className={`h-11 border-b-2 px-3 text-sm ${
            activeTab === "tests"
              ? "border-teal-600 text-zinc-950 dark:border-blue-500 dark:text-[#e6edf3]"
              : "border-transparent text-zinc-500 hover:text-zinc-950 dark:text-[#8b949e] dark:hover:text-[#e6edf3]"
          }`}
          onClick={() => onChangeTab("tests")}
          type="button"
        >
          テストケース
        </button>
        <button
          className={`h-11 border-b-2 px-3 text-sm ${
            activeTab === "custom"
              ? "border-teal-600 text-zinc-950 dark:border-blue-500 dark:text-[#e6edf3]"
              : "border-transparent text-zinc-500 hover:text-zinc-950 dark:text-[#8b949e] dark:hover:text-[#e6edf3]"
          }`}
          onClick={() => onChangeTab("custom")}
          type="button"
        >
          カスタム
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] dark:[scrollbar-color:#30363d_transparent]">
        {activeTab === "tests" ? (
          <div className="grid gap-3">
            <SampleCaseAccordion
              onSelect={onSelectSample}
              openIndex={selectedSampleIndex}
              samples={samples}
            />
            <button
              className="inline-flex h-9 w-fit items-center gap-2 rounded border border-teal-200 bg-teal-50 px-3 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:cursor-wait disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              disabled={isRunning || samples.length === 0}
              onClick={onRunSample}
              type="button"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {isRunning ? "実行中..." : "選択中のテストで実行"}
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            <textarea
              className="min-h-48 resize-y rounded border border-zinc-200 bg-white p-3 font-mono text-sm leading-6 text-zinc-800 outline-none focus:border-teal-600 dark:border-[#30363d] dark:bg-[#010409] dark:text-[#e6edf3] dark:focus:border-blue-500"
              onChange={(event) => onChangeCustomInput(event.target.value)}
              spellCheck={false}
              value={customInput}
            />
            <button
              className="inline-flex h-9 w-fit items-center gap-2 rounded border border-teal-200 bg-teal-50 px-3 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:cursor-wait disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              disabled={isRunning}
              onClick={onRunCustom}
              type="button"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {isRunning ? "実行中..." : "カスタム入力で実行"}
            </button>
          </div>
        )}
      </div>

      <ResultView isRunning={isRunning} runResult={runResult} submitResult={submitResult} />
    </div>
  );
}
