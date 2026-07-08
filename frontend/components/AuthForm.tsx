"use client";

import {
  ArrowRight,
  BarChart3,
  Code2,
  Loader2,
  Lock,
  Mail,
  Trophy,
  User
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, InputHTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { getMe, login, register } from "@/lib/api";

type AuthFormProps = {
  mode: "login" | "register";
};

type AuthFieldProps = {
  icon: LucideIcon;
  label: string;
  wrapperClassName?: string;
} & InputHTMLAttributes<HTMLInputElement>;

const featureItems = [
  { icon: Code2, label: "Code" },
  { icon: BarChart3, label: "Submit" },
  { icon: Trophy, label: "Improve" }
];

const codeDecorations = [
  {
    text: "for (int i = 0; i < n; ++i) relax(edge[i]);",
    className: "left-[5%] top-[14%] rotate-[-2deg]"
  },
  {
    text: "dp[v] = min(dp[v], dp[u] + cost);",
    className: "right-[7%] top-[18%] rotate-[2deg]"
  },
  {
    text: "if (verdict === \"AC\") score += points;",
    className: "left-[8%] bottom-[19%] rotate-[1deg]"
  },
  {
    text: "queue.push({ node, dist: nextDist });",
    className: "right-[10%] bottom-[15%] rotate-[-2deg]"
  }
];

const judgeStatusDecorations = [
  {
    text: "AC",
    className:
      "left-[12%] top-[64%] border-emerald-300/20 text-emerald-300/30 shadow-[0_0_28px_rgba(52,211,153,0.14)]"
  },
  {
    text: "WA",
    className:
      "left-[26%] top-[28%] border-rose-300/20 text-rose-200/20 shadow-[0_0_24px_rgba(244,63,94,0.10)]"
  },
  {
    text: "TLE",
    className:
      "right-[25%] top-[58%] border-amber-300/20 text-amber-200/20 shadow-[0_0_24px_rgba(251,191,36,0.10)]"
  },
  {
    text: "MLE",
    className:
      "right-[13%] top-[34%] border-cyan-300/20 text-cyan-200/25 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
  },
  {
    text: "RE",
    className:
      "left-[42%] bottom-[10%] border-red-300/20 text-red-200/20 shadow-[0_0_24px_rgba(248,113,113,0.10)]"
  }
];

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
        setSuccess("Your registration request has been received. You can log in after an administrator approves your account.");
      }
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";
  const formClassName = [
    "group relative w-full rounded-lg border border-emerald-200/20 bg-slate-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.52),0_0_70px_rgba(45,212,191,0.16)] backdrop-blur-2xl transition duration-300 hover:border-cyan-300/40 hover:shadow-[0_28px_90px_rgba(0,0,0,0.58),0_0_82px_rgba(34,211,238,0.18)]",
    isLogin
      ? "max-w-[520px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10"
      : "max-w-[760px] px-5 py-5 sm:px-7 sm:py-6 lg:px-8",
  ].join(" ");

  return (
    <section className="relative flex min-h-0 flex-1 overflow-x-hidden bg-[#020617] text-white">
      <AuthBackgroundDecorations />

      <div className="relative z-10 mx-auto grid min-h-full w-full max-w-[1600px] grid-cols-1 items-center gap-6 px-5 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(400px,760px)] lg:gap-10 lg:px-[5vw] lg:py-8 xl:gap-16">
        <BrandPanel isLogin={isLogin} />

        <section className="flex w-full justify-center lg:justify-end">
          <form
            className={formClassName}
            onSubmit={handleSubmit}
          >
            <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.18),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.10),transparent_45%)]" />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
            <div className="pointer-events-none absolute -inset-px rounded-lg opacity-0 ring-1 ring-cyan-200/30 transition duration-300 group-hover:opacity-100" />

            <div className="relative">
              <div className={`${isLogin ? "mb-6" : "mb-4"} flex flex-wrap items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/75 sm:justify-between sm:text-[0.68rem]`}>
                <span>ISC_onlinejudge</span>
                <span className="hidden sm:inline">Online Judge Platform</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className={`${isLogin ? "h-16 w-16" : "h-12 w-12"} relative flex items-center justify-center`}>
                  <div className="absolute inset-[-10px] rounded-lg bg-emerald-400/20 blur-lg" />
                  <div className={`${isLogin ? "h-16 w-16" : "h-12 w-12"} relative flex items-center justify-center overflow-hidden rounded-lg border border-cyan-100/30 bg-white shadow-[0_14px_36px_rgba(0,0,0,0.44)]`}>
                    <img
                      alt="Wait for Judge"
                      className="h-full w-full object-cover"
                      src="/static/image/WfJlogo.png"
                    />
                  </div>
                </div>

                <div className={isLogin ? "mb-8 mt-6" : "mb-5 mt-4"}>
                  <h1 className={`${isLogin ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"} font-bold tracking-normal text-white`}>
                    Wait for Judge
                  </h1>
                  <p className={`${isLogin ? "mt-3" : "mt-2"} font-mono text-sm text-emerald-200/90`}>
                    Code. Submit. Improve.
                  </p>
                  <p className={`${isLogin ? "mt-4" : "mt-2"} text-sm font-medium text-slate-300`}>
                    {isLogin ? "Log in and wait for the judge" : "Register a new challenger"}
                  </p>
                </div>

                {isLogin ? (
                  <div className="mb-8 grid w-full grid-cols-3 gap-2 rounded-md border border-white/10 bg-slate-900/40 p-2">
                    {featureItems.map(({ icon: Icon, label }) => (
                      <div
                        className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-md border border-white/5 bg-white/[0.025] px-2 text-cyan-100/80"
                        key={label}
                      >
                        <Icon className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                        <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em]">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={`${isLogin ? "mb-6" : "mb-4"} flex items-center gap-3`}>
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-300/30 to-emerald-300/10" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">
                  {isLogin ? "Login" : "Register"}
                </h2>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent via-cyan-300/30 to-cyan-300/10" />
              </div>

              {!isLogin ? (
                <div className="mb-4 rounded-md border border-amber-200/25 bg-amber-300/10 px-3 py-2 text-sm leading-6 text-amber-100">
                  Registration is currently invite-only. A PIN code is required to create an account.
                </div>
              ) : null}

              <div className={isLogin ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
                {isLogin ? (
                  <AuthField
                    autoComplete="username"
                    icon={User}
                    label="username or email"
                    onChange={(event) => setIdentity(event.target.value)}
                    required
                    value={identity}
                  />
                ) : (
                  <>
                    <AuthField
                      autoComplete="username"
                      icon={User}
                      label="username"
                      onChange={(event) => setUsername(event.target.value)}
                      required
                      value={username}
                    />
                    <AuthField
                      autoComplete="name"
                      icon={User}
                      label="display name"
                      onChange={(event) => setDisplayName(event.target.value)}
                      value={displayName}
                    />
                    <AuthField
                      autoComplete="email"
                      icon={Mail}
                      label="email"
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      type="email"
                      value={email}
                    />
                    <AuthField
                      autoComplete="one-time-code"
                      icon={Lock}
                      label="pin code"
                      onChange={(event) => setPinCode(event.target.value)}
                      required
                      value={pinCode}
                    />
                  </>
                )}

                <AuthField
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  icon={Lock}
                  label="password"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                  wrapperClassName={isLogin ? "" : "sm:col-span-2"}
                />
              </div>

              {error ? (
                <p className="mt-4 rounded-md border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
                  {error}
                </p>
              ) : null}

              {success ? (
                <p className="mt-4 rounded-md border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100">
                  {success}
                </p>
              ) : null}

              <button
                className={`${isLogin ? "mt-7" : "mt-5"} group/button relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-md border border-emerald-200/30 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-5 text-base font-bold text-slate-950 shadow-[0_16px_42px_rgba(20,184,166,0.24)] transition duration-200 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-300 hover:shadow-[0_18px_52px_rgba(34,211,238,0.26)] focus:outline-none focus:ring-2 focus:ring-cyan-200/60 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-70`}
                disabled={submitting}
                type="submit"
              >
                <span className="pointer-events-none absolute inset-0 translate-x-[-110%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition duration-700 group-hover/button:translate-x-[110%]" />
                <span className="relative inline-flex items-center gap-2">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {isLogin ? "Login" : "Register"}
                </span>
                <ArrowRight
                  className="absolute right-5 h-5 w-5 transition group-hover/button:translate-x-1"
                  aria-hidden="true"
                />
              </button>

              {isLogin ? (
                <div className="mt-7">
                  <div className="flex items-center gap-5 text-sm text-zinc-400">
                    <span className="h-px flex-1 bg-white/20" />
                    <span>or</span>
                    <span className="h-px flex-1 bg-white/20" />
                  </div>
                  <div className="mt-6 text-center">
                    <Link
                      className="text-base font-semibold text-emerald-300 transition hover:text-cyan-200"
                      href="/register"
                    >
                      Create an account
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-5 text-center">
                  <Link
                    className="text-base font-semibold text-emerald-300 transition hover:text-cyan-200"
                    href="/login"
                  >
                    Back to login
                  </Link>
                </div>
              )}
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}

function AuthBackgroundDecorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.22),transparent_30%),radial-gradient(circle_at_76%_12%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_48%_82%,rgba(20,184,166,0.14),transparent_34%),linear-gradient(135deg,#020617_0%,#061316_44%,#020617_100%)]" />
      <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(45,212,191,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.14)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_26%,transparent_78%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(125,211,252,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.28)_1px,transparent_1px)] [background-size:176px_176px]" />
      <div className="absolute left-[-24%] top-[8%] h-80 w-[46rem] rotate-[-12deg] bg-[linear-gradient(90deg,rgba(16,185,129,0.18),transparent_70%)] blur-3xl" />
      <div className="absolute right-[-28%] bottom-[4%] h-80 w-[52rem] rotate-[10deg] bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.14),transparent)] blur-3xl" />

      {codeDecorations.map(({ text, className }) => (
        <span
          className={`absolute hidden max-w-[22rem] select-none font-mono text-xs text-cyan-100/10 sm:block ${className}`}
          key={text}
        >
          {text}
        </span>
      ))}

      {judgeStatusDecorations.map(({ text, className }) => (
        <span
          className={`absolute hidden rounded-md border bg-slate-950/20 px-3 py-1 font-mono text-lg font-black tracking-[0.22em] backdrop-blur-sm sm:block ${className}`}
          key={text}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

function AuthField({
  icon: Icon,
  label,
  className = "",
  wrapperClassName = "",
  ...inputProps
}: AuthFieldProps) {
  return (
    <label className={`block ${wrapperClassName}`}>
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <span className="relative block">
        <input
          className={`peer h-12 w-full rounded-md border border-white/20 bg-slate-950/50 px-4 pr-12 text-base text-white outline-none transition duration-200 placeholder:text-slate-500 hover:border-emerald-200/30 focus:border-cyan-300 focus:bg-slate-900/80 focus:shadow-[0_0_0_1px_rgba(45,212,191,0.28),0_0_24px_rgba(34,211,238,0.14)] focus:ring-2 focus:ring-cyan-300/20 ${className}`}
          {...inputProps}
        />
        <Icon
          className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-300/80 transition duration-200 peer-focus:text-cyan-200 peer-focus:drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function BrandPanel({ isLogin }: { isLogin: boolean }) {
  return (
    <section className={`${isLogin ? "min-h-[680px]" : "min-h-[600px]"} relative hidden items-center lg:flex`}>
      <div className="relative w-full max-w-[690px]">
        <div className="absolute -left-10 top-8 h-36 w-36 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.025] shadow-[0_0_60px_rgba(45,212,191,0.08)]" />
        <div className="absolute right-16 top-0 h-20 w-20 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.025]" />

        <div className="relative">
          <div className="inline-flex items-center gap-3 rounded-md border border-emerald-200/20 bg-slate-950/50 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-emerald-200/90 backdrop-blur-md">
            <span className="h-2 w-2 rounded-sm bg-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.8)]" />
            ISC_onlinejudge
          </div>

          <h2 className="mt-8 max-w-3xl text-5xl font-bold tracking-normal text-white xl:text-6xl">
            {isLogin ? "Wait for Judge" : "Join Wait for Judge"}
          </h2>
          <p className="mt-5 font-mono text-lg text-cyan-100/90">Code. Submit. Improve.</p>
          <p className="mt-5 max-w-xl text-base font-medium leading-8 text-slate-300">
            An online judge platform for competitive programming,
            built to make the flow from submission to judging to improvement quiet, fast, and seamless.

          </p>

          <div className="mt-10 max-w-xl rounded-lg border border-white/10 bg-slate-950/50 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-300/70" />
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-300/70" />
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-300/70" />
              <span className="ml-auto font-mono text-xs text-cyan-100/60">judgectl</span>
            </div>

            <div className="mt-5 space-y-3 font-mono text-sm text-slate-300">
              <p>
                <span className="text-cyan-300">$</span> submit main.cpp --problem A
              </p>
              <div className="grid grid-cols-[88px_1fr_42px] items-center gap-3">
                <span className="text-slate-500">compile</span>
                <span className="h-px bg-gradient-to-r from-emerald-300/70 to-transparent" />
                <span className="text-right text-emerald-300">OK</span>
              </div>
              <div className="grid grid-cols-[88px_1fr_42px] items-center gap-3">
                <span className="text-slate-500">tests</span>
                <span className="h-px bg-gradient-to-r from-cyan-300/70 to-transparent" />
                <span className="text-right text-cyan-200">42/42</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {["AC", "WA", "TLE", "MLE", "RE"].map((status) => (
                  <span
                    className="rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs font-semibold text-slate-300"
                    key={status}
                  >
                    {status}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="absolute bottom-0 left-[-4vw] text-sm text-slate-500">
        (c) 2026 Wait for Judge. All rights reserved.
      </p>
    </section>
  );
}

function authErrorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "";
  if (message.includes("invalid pin code")) {
    return "The PIN code is incorrect.";
  }
  if (message.includes("user is inactive")) {
    return "This account is waiting for approval. You can log in after an administrator approves it.";
  }
  return message || "Authentication failed.";
}
