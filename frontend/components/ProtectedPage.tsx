"use client";

import { AlertTriangle, Clock3, Loader2, LogOut, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import type { CurrentUser } from "@/lib/api";
import { getMe, isApprovedUser, logout } from "@/lib/api";

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
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    setChecking(true);
    setError("");
    getMe().then((nextUser) => {
      if (ignore) {
        return;
      }
      if (!nextUser) {
        router.replace("/login");
        return;
      }
      if (!isApprovedUser(nextUser)) {
        setUser(nextUser);
        setChecking(false);
        return;
      }
      if (authorize && !authorize(nextUser)) {
        router.replace(unauthorizedRedirectTo);
        return;
      }
      setUser(nextUser);
      setChecking(false);
    }).catch((cause) => {
      if (!ignore) {
        setError(authCheckErrorMessage(cause));
        setChecking(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [authorize, router, unauthorizedRedirectTo, retryCount]);

  if (error) {
    return (
      <AuthCheckError
        message={error}
        onRetry={() => setRetryCount((value) => value + 1)}
      />
    );
  }

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
      {isApprovedUser(user) ? children(user) : <ApprovalPending user={user} />}
    </div>
  );
}

function AuthCheckError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 text-zinc-950">
      <section className="w-full max-w-md rounded-md border border-rose-200 bg-white p-5 shadow-sm">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-rose-50 text-rose-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold tracking-normal">
          認証状態を確認できません
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{message}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
            onClick={onRetry}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            再試行
          </button>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            href="/login"
          >
            ログインへ
          </Link>
        </div>
      </section>
    </main>
  );
}

function ApprovalPending({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const suspended = user.status === "suspended";

  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl items-center px-4 py-8">
      <section className="w-full rounded-md border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-amber-50 text-amber-700">
          <Clock3 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          {suspended ? "アカウントは利用停止中です" : "承認待ちです"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {suspended
            ? "このアカウントでは現在サイトを利用できません。管理者に連絡してください。"
            : "登録は完了していますが、管理者の承認がまだ完了していません。承認されるまでDashboardや問題一覧にはアクセスできません。"}
        </p>
        <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm text-zinc-600">
          <div className="font-medium text-zinc-950">@{user.username}</div>
          <div>{user.displayName || user.email}</div>
          <div className="mt-1">status: {user.status}</div>
        </div>
        <button
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          onClick={handleLogout}
          type="button"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          ログアウト
        </button>
      </section>
    </main>
  );
}

function authCheckErrorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "";
  return message
    ? `API サーバーへの接続に失敗しました: ${message}`
    : "API サーバーへの接続に失敗しました。";
}
