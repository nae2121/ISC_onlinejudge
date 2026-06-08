import { Gauge, ListChecks, ShieldCheck, UserCircle } from "lucide-react";
import Link from "next/link";
import type { CurrentUser } from "@/lib/api";
import { isAdminUser } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

export function Header({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center gap-3 px-4">
        <Link className="flex shrink-0 items-center" href="/dashboard">
          <img
            alt="Wait for Judge"
            className="h-9 w-auto object-contain"
            src="/static/image/WfJ.png"
          />
        </Link>
        <nav className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          <Link
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            href="/dashboard"
          >
            <Gauge className="h-4 w-4" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          <Link
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            href="/problems"
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            <span>Problems</span>
          </Link>
          <Link
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            href="/profile"
          >
            <UserCircle className="h-4 w-4" aria-hidden="true" />
            <span>Profile</span>
          </Link>
          {isAdminUser(user) ? (
            <Link
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              href="/admin"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Admin</span>
            </Link>
          ) : null}
        </nav>
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
