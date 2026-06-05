"use client";

import { LogOut, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CurrentUser } from "@/lib/api";
import { logout } from "@/lib/api";

export function UserMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        className="hidden items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 sm:inline-flex"
        href="/profile"
      >
        <UserCircle className="h-4 w-4" aria-hidden="true" />
        <span>{user.displayName}</span>
      </Link>
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
        onClick={handleLogout}
        title="ログアウト"
        type="button"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
