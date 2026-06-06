import type { JudgeStatus } from "@/types/submission";

const statusClasses: Record<JudgeStatus, string> = {
  AC: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
  WA: "border-rose-400/30 bg-rose-500/15 text-rose-300",
  TLE: "border-amber-400/30 bg-amber-500/15 text-amber-300",
  MLE: "border-amber-400/30 bg-amber-500/15 text-amber-300",
  RE: "border-red-400/30 bg-red-500/15 text-red-300",
  CE: "border-orange-400/30 bg-orange-500/15 text-orange-300",
  OLE: "border-violet-400/30 bg-violet-500/15 text-violet-300",
  IE: "border-zinc-400/30 bg-zinc-500/15 text-zinc-300",
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
