import type { SubmissionStatus } from "@/lib/api";

const statusClasses: Record<SubmissionStatus, string> = {
  AC: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WA: "border-rose-200 bg-rose-50 text-rose-700",
  TLE: "border-amber-200 bg-amber-50 text-amber-700",
  MLE: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  RE: "border-orange-200 bg-orange-50 text-orange-700",
  CE: "border-violet-200 bg-violet-50 text-violet-700",
  OLE: "border-sky-200 bg-sky-50 text-sky-700",
  IE: "border-zinc-300 bg-zinc-100 text-zinc-700",
  WJ: "border-slate-200 bg-slate-50 text-slate-600",
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={`inline-flex h-6 min-w-12 items-center justify-center rounded-md border px-2 text-xs font-semibold ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
