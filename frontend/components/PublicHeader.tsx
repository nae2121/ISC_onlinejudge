import {
  FileClock,
  FileText,
  History,
  Home,
  LogIn,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type PublicNavKey = "home" | "members" | "terms" | "privacy" | "changelog";

const navItems: Array<{
  href: string;
  icon: typeof Home;
  key: PublicNavKey;
  label: string;
}> = [
  { href: "/", icon: Home, key: "home", label: "Home" },
  { href: "/members", icon: Users, key: "members", label: "Members" },
  { href: "/terms", icon: FileText, key: "terms", label: "Terms of Service" },
  { href: "/privacy", icon: ShieldCheck, key: "privacy", label: "Privacy Policy" },
  { href: "/changelog", icon: History, key: "changelog", label: "Changelog" },
];

export function PublicHeader({ active = "home" }: { active?: PublicNavKey }) {
  return (
    <header className="sticky top-0 z-30 border-b border-cyan-300/15 bg-[#02070c]/90 text-zinc-100 shadow-[0_1px_28px_rgba(20,241,216,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[104px] w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 xl:min-h-[78px] xl:flex-nowrap xl:py-0">
        <Link
          className="group order-1 flex shrink-0 items-center gap-3"
          href="/"
          aria-label="WfJ Home"
        >
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_24px_rgba(20,241,216,0.18)]">
            <Image
              alt=""
              className="h-9 w-9 object-contain invert transition group-hover:scale-105"
              height={40}
              src="/static/image/WfJlogo.png"
              width={40}
            />
          </span>
          <span className="hidden font-mono text-sm text-cyan-100/75 sm:inline">
            ISC_onlinejudge
          </span>
        </Link>

        <nav className="order-3 flex w-full min-w-0 flex-wrap items-center justify-center gap-1 px-1 xl:order-2 xl:w-auto xl:flex-1 xl:flex-nowrap">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = item.key === active;

            return (
              <Link
                className={[
                  "relative inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition",
                  selected
                    ? "text-cyan-200"
                    : "text-zinc-300/85 hover:bg-cyan-300/10 hover:text-cyan-100",
                ].join(" ")}
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
                {selected ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(20,241,216,0.9)]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 ml-auto hidden shrink-0 items-center gap-2 lg:flex xl:order-3 xl:ml-0">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-300/55 bg-transparent px-4 text-sm font-semibold text-zinc-100 transition hover:bg-cyan-300/10 hover:text-cyan-100"
            href="/login"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Login
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-200/70 bg-cyan-300 px-4 text-sm font-bold text-[#02110f] shadow-[0_0_24px_rgba(20,241,216,0.28)] transition hover:bg-cyan-200"
            href="/register"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Join
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-cyan-300/10 bg-[#02070c] text-zinc-400">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <span>© 2026 WfJ (ISC_onlinejudge)</span>
        </div>
      </div>
    </footer>
  );
}
