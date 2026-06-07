import type { JudgeStatus } from "@/types/submission";

const statusClasses: Record<JudgeStatus, string> = {
  AC: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  WA: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-300",
  TLE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300",
  MLE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300",
  RE: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-300",
  CE: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/15 dark:text-orange-300",
  OLE: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-300",
  IE: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-400/30 dark:bg-zinc-500/15 dark:text-zinc-300",
};

export function StatusBadge({ status }: { status: JudgeStatus }) {
  return (
    <span
      className={`inline-flex h-6 min-w-12 items-center justify-center rounded border px-2 text-xs font-semibold ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
