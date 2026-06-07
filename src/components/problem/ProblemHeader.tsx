import { BookOpen, Code2, Gauge, ListChecks, ShieldCheck, Trophy, UserCircle } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { CurrentUser, Problem } from "@/lib/api";
import { isAdminUser } from "@/lib/api";

export function ProblemHeader({ problem, user }: { problem: Problem | null; user: CurrentUser }) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 text-zinc-950 dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#e6edf3]">
      <Link className="flex shrink-0 items-center gap-2 text-sm font-bold text-zinc-950 dark:text-[#e6edf3]" href="/dashboard">
        <Code2 className="h-4 w-4 text-teal-700 dark:text-emerald-400" aria-hidden="true" />
        <span>Wait for Judge</span>
      </Link>

      <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm text-zinc-600 dark:text-[#8b949e]">
        <Link
          className="inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-[#21262d] dark:hover:text-[#e6edf3]"
          href="/dashboard"
        >
          <Gauge className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>
        <Link
          className="inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-[#21262d] dark:hover:text-[#e6edf3]"
          href="/problems"
        >
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          Problems
        </Link>
        <Link
          className="inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-[#21262d] dark:hover:text-[#e6edf3]"
          href="/profile"
        >
          <UserCircle className="h-4 w-4" aria-hidden="true" />
          Profile
        </Link>
        {isAdminUser(user) ? (
          <Link
            className="inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-[#21262d] dark:hover:text-[#e6edf3]"
            href="/admin"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        <ThemeToggle />
        <div className="hidden min-w-0 items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 dark:border-[#30363d] dark:bg-[#0d1117] dark:text-[#8b949e] md:flex">
          <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">
            {problem ? `${problem.slug} - ${problem.title}` : "問題を読み込み中"}
          </span>
          {problem ? (
            <span className="inline-flex items-center gap-1 text-teal-700 dark:text-emerald-400">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              {problem.score}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
