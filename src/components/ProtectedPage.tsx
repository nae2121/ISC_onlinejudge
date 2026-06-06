"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import type { CurrentUser } from "@/lib/api";
import { getMe } from "@/lib/api";

type ProtectedPageProps = {
  authorize?: (user: CurrentUser) => boolean;
  children: (user: CurrentUser) => ReactNode;
  loadingLabel?: string;
  showHeader?: boolean;
  unauthorizedRedirectTo?: string;
};

export function ProtectedPage({
  authorize,
  children,
  loadingLabel = "認証状態を確認中",
  showHeader = true,
  unauthorizedRedirectTo = "/dashboard",
}: ProtectedPageProps) {
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
      if (authorize && !authorize(nextUser)) {
        router.replace(unauthorizedRedirectTo);
        return;
      }
      setUser(nextUser);
      setChecking(false);
    }).catch(() => {
      if (!ignore) {
        router.replace("/login");
      }
    });

    return () => {
      ignore = true;
    };
  }, [authorize, router, unauthorizedRedirectTo]);

  if (checking || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-zinc-50 text-zinc-600">
        <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950">
      {showHeader ? <Header user={user} /> : null}
      {children(user)}
    </div>
  );
}
