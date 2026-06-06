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
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[#0d1117]">
      <div className="flex min-h-11 items-center border-b border-[#30363d] bg-[#161b22] px-3">
        <button
          className={`h-11 border-b-2 px-3 text-sm ${
            activeTab === "tests"
              ? "border-blue-500 text-[#e6edf3]"
              : "border-transparent text-[#8b949e] hover:text-[#e6edf3]"
          }`}
          onClick={() => onChangeTab("tests")}
          type="button"
        >
          テストケース
        </button>
        <button
          className={`h-11 border-b-2 px-3 text-sm ${
            activeTab === "custom"
              ? "border-blue-500 text-[#e6edf3]"
              : "border-transparent text-[#8b949e] hover:text-[#e6edf3]"
          }`}
          onClick={() => onChangeTab("custom")}
          type="button"
        >
          カスタム
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-color:#30363d_transparent] [scrollbar-width:thin]">
        {activeTab === "tests" ? (
          <div className="grid gap-3">
            <SampleCaseAccordion
              onSelect={onSelectSample}
              openIndex={selectedSampleIndex}
              samples={samples}
            />
            <button
              className="inline-flex h-9 w-fit items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-wait disabled:opacity-60"
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
              className="min-h-48 resize-y rounded border border-[#30363d] bg-[#010409] p-3 font-mono text-sm leading-6 text-[#e6edf3] outline-none focus:border-blue-500"
              onChange={(event) => onChangeCustomInput(event.target.value)}
              spellCheck={false}
              value={customInput}
            />
            <button
              className="inline-flex h-9 w-fit items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-wait disabled:opacity-60"
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
