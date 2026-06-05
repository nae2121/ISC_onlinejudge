"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import type { CurrentUser } from "@/lib/api";
import { getMe } from "@/lib/api";

type ProtectedPageProps = {
  children: (user: CurrentUser) => ReactNode;
};

export function ProtectedPage({ children }: ProtectedPageProps) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let ignore = false;
    getMe().then((nextUser) => {
      if (ignore) {
        return;
      }
      if (!nextUser) {
        router.replace("/login");
        return;
      }
      setUser(nextUser);
      setChecking(false);
    });

    return () => {
      ignore = true;
    };
  }, [router]);

  if (checking || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-zinc-50 text-zinc-600">
        <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          認証状態を確認中
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950">
      <Header user={user} />
      {children(user)}
    </div>
  );
}
