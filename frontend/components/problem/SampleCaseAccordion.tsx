"use client";

import { ChevronDown } from "lucide-react";
import type { ProblemSample } from "@/lib/api";

type SampleCaseAccordionProps = {
  onSelect: (index: number) => void;
  openIndex: number;
  samples: ProblemSample[];
};

export function SampleCaseAccordion({
  onSelect,
  openIndex,
  samples,
}: SampleCaseAccordionProps) {
  if (samples.length === 0) {
    return (
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500 dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#8b949e]">
        サンプル入力・出力はまだAPIから取得できません。カスタム入力を使って実行してください。
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {samples.map((sample, index) => {
        const open = openIndex === index;
        return (
          <div className="overflow-hidden rounded border border-zinc-200 bg-white dark:border-[#30363d] dark:bg-[#0d1117]" key={sample.name}>
            <button
              className="flex h-9 w-full items-center justify-between bg-zinc-50 px-3 text-left text-sm text-zinc-950 hover:bg-zinc-100 dark:bg-[#161b22] dark:text-[#e6edf3] dark:hover:bg-[#1c222b]"
              onClick={() => onSelect(index)}
              type="button"
            >
              <span>{sample.name}</span>
              <ChevronDown
                className={`h-4 w-4 text-zinc-500 transition-transform dark:text-[#8b949e] ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {open ? (
              <div className="grid grid-cols-2 border-t border-zinc-200 text-xs dark:border-[#30363d]">
                <div className="border-r border-zinc-200 p-3 dark:border-[#30363d]">
                  <p className="mb-2 text-zinc-500 dark:text-[#8b949e]">入力</p>
                  <pre className="whitespace-pre-wrap font-mono leading-5 text-zinc-800 dark:text-[#e6edf3]">{sample.input}</pre>
                </div>
                <div className="p-3">
                  <p className="mb-2 text-zinc-500 dark:text-[#8b949e]">期待出力</p>
                  <pre className="whitespace-pre-wrap font-mono leading-5 text-zinc-800 dark:text-[#e6edf3]">{sample.output}</pre>
                </div>
                {sample.explanation ? (
                  <p className="col-span-2 border-t border-zinc-200 p-3 text-zinc-500 dark:border-[#30363d] dark:text-[#8b949e]">
                    {sample.explanation}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
