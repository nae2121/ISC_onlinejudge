import { BookOpen, Clock, Database, Trophy } from "lucide-react";
import type { Problem } from "@/lib/api";

type ProblemPanelProps = {
  loading: boolean;
  problem: Problem | null;
};

export function ProblemPanel({ loading, problem }: ProblemPanelProps) {
  if (loading) {
    return <div className="p-5 text-sm text-zinc-500 dark:text-[#8b949e]">問題を読み込み中...</div>;
  }

  if (!problem) {
    return <div className="p-5 text-sm text-zinc-500 dark:text-[#8b949e]">問題が見つかりません。</div>;
  }

  return (
    <div className="h-full min-w-0 overflow-y-auto px-5 py-4 text-zinc-800 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] dark:text-[#e6edf3] dark:[scrollbar-color:#30363d_transparent]">
      <div className="mb-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-[#8b949e]">
          <span>{problem.slug}</span>
          <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 dark:border-[#30363d] dark:bg-[#161b22]">
            {problem.score} pts
          </span>
        </div>
        <h1 className="text-xl font-semibold tracking-normal text-zinc-950 dark:text-[#e6edf3]">{problem.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-[#8b949e]">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {problem.timeLimitMs} ms
          </span>
          <span className="inline-flex items-center gap-1">
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            {problem.memoryLimitMb} MB
          </span>
          <span className="inline-flex items-center gap-1 text-teal-700 dark:text-emerald-400">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            {problem.score}
          </span>
        </div>
      </div>

      <Section title="問題文" icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-zinc-800 dark:text-[#e6edf3]">
          {problem.statement || "問題文はまだ登録されていません。"}
        </pre>
      </Section>

      {problem.constraints ? <CodeSection title="制約" value={problem.constraints} /> : null}
      {problem.inputFormat ? <CodeSection title="入力" value={problem.inputFormat} /> : null}
      {problem.outputFormat ? <CodeSection title="出力" value={problem.outputFormat} /> : null}

      {problem.samples.length > 0 ? (
        <Section title="サンプル">
          <div className="grid gap-3">
            {problem.samples.map((sample) => (
              <div className="overflow-hidden rounded border border-zinc-200 dark:border-[#30363d]" key={sample.name}>
                <div className="bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:bg-[#161b22] dark:text-[#8b949e]">{sample.name}</div>
                <div className="grid grid-cols-2 text-xs">
                  <div className="border-r border-zinc-200 p-3 dark:border-[#30363d]">
                    <p className="mb-2 text-zinc-500 dark:text-[#8b949e]">入力</p>
                    <pre className="whitespace-pre-wrap font-mono text-zinc-800 dark:text-[#e6edf3]">{sample.input}</pre>
                  </div>
                  <div className="p-3">
                    <p className="mb-2 text-zinc-500 dark:text-[#8b949e]">出力</p>
                    <pre className="whitespace-pre-wrap font-mono text-zinc-800 dark:text-[#e6edf3]">{sample.output}</pre>
                  </div>
                </div>
                {sample.explanation ? (
                  <p className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-[#30363d] dark:text-[#8b949e]">
                    {sample.explanation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-zinc-200 py-4 dark:border-[#30363d]">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-[#e6edf3]">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function CodeSection({ title, value }: { title: string; value: string }) {
  return (
    <Section title={title}>
      <pre className="overflow-auto rounded border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm leading-6 text-zinc-800 dark:border-[#30363d] dark:bg-[#0d1117] dark:text-[#e6edf3]">
        {value}
      </pre>
    </Section>
  );
}
