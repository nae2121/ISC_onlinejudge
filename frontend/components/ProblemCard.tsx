import { CheckCircle2, Clock, Database, Tag } from "lucide-react";
import Link from "next/link";
import type { Problem } from "@/lib/api";

const difficultyClasses: Record<Problem["difficulty"], string> = {
  beginner: "border-sky-200 bg-sky-50 text-sky-700",
  easy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  hard: "border-rose-200 bg-rose-50 text-rose-700",
};

export function ProblemCard({ problem }: { problem: Problem }) {
  const acceptance =
    problem.submissionCount > 0
      ? Math.round((problem.acceptedCount / problem.submissionCount) * 100)
      : 0;

  return (
    <Link
      className="grid gap-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:border-teal-300 hover:bg-teal-50/30"
      href={`/problems/${encodeURIComponent(problem.slug)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-zinc-950">
            <span className="min-w-0 truncate">{problem.title}</span>
            {problem.solved ? (
              <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                AC
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{problem.slug}</p>
        </div>
        <span
          className={`inline-flex h-7 items-center rounded-md border px-2 text-xs font-semibold ${difficultyClasses[problem.difficulty]}`}
        >
          {problem.difficulty}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
        <span className="font-semibold text-zinc-900">{problem.score} pts</span>
        <span>AC率 {acceptance}%</span>
        <span>{problem.acceptedCount.toLocaleString()} AC</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {problem.timeLimitMs / 1000}s
        </span>
        <span className="inline-flex items-center gap-1">
          <Database className="h-3.5 w-3.5" aria-hidden="true" />
          {problem.memoryLimitMb}MB
        </span>
        {problem.tags.slice(0, 3).map((tag) => (
          <span className="inline-flex items-center gap-1" key={tag}>
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
