"use client";

import { Loader2, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { getMe, login, register } from "@/lib/api";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    getMe().then((user) => {
      if (!ignore && user) {
        router.replace("/dashboard");
      }
    });
    return () => {
      ignore = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login({ identity, password });
        router.replace("/dashboard");
        router.refresh();
      } else {
        await register({ username, displayName, email, password, pinCode });
        setUsername("");
        setDisplayName("");
        setEmail("");
        setPassword("");
        setPinCode("");
        setSuccess("登録申請を受け付けました。管理者の承認後にログインできます。");
      }
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-8 text-zinc-950">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md items-center">
        <form
          className="w-full rounded-md border border-zinc-200 bg-white p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="mb-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
              {isLogin ? (
                <LogIn className="h-5 w-5" aria-hidden="true" />
              ) : (
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">
              {isLogin ? "ログイン" : "ユーザー登録"}
            </h1>
          </div>

          <div className="space-y-4">
            {isLogin ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">
                  username または email
                </span>
                <input
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  onChange={(event) => setIdentity(event.target.value)}
                  required
                  value={identity}
                />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">username</span>
                  <input
                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    value={username}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">
                    display name
                  </span>
                  <input
                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => setDisplayName(event.target.value)}
                    value={displayName}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">email</span>
                  <input
                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">pin code</span>
                  <input
                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => setPinCode(event.target.value)}
                    required
                    value={pinCode}
                  />
                </label>
              </>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">password</span>
              <input
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <button
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-70"
            disabled={submitting}
            type="submit"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {isLogin ? "ログイン" : "登録"}
          </button>

          <div className="mt-5 text-center text-sm text-zinc-600">
            {isLogin ? (
              <Link className="font-medium text-teal-700 hover:text-teal-800" href="/register">
                新規登録へ
              </Link>
            ) : (
              <Link className="font-medium text-teal-700 hover:text-teal-800" href="/login">
                ログインへ
              </Link>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function authErrorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "";
  if (message.includes("invalid pin code")) {
    return "PINコードが正しくありません。";
  }
  if (message.includes("user is inactive")) {
    return "このアカウントは承認待ちです。管理者の承認後にログインできます。";
  }
  return message || "認証に失敗しました";
}
