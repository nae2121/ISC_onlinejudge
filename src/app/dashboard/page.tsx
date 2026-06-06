"use client";

import {
  ArrowRight,
  CheckCircle2,
  FileCode2,
  ListChecks,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { SubmissionStatusBadge } from "@/components/SubmissionStatusBadge";
import type { CurrentUser, Problem, Submission } from "@/lib/api";
import { getMySubmissions, getProblems, isAdminUser } from "@/lib/api";

export default function DashboardPage() {
  return <ProtectedPage>{(user) => <DashboardContent user={user} />}</ProtectedPage>;
}

function DashboardContent({ user }: { user: CurrentUser }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    getProblems().then(setProblems).catch(() => setProblems([]));
    getMySubmissions().then(setSubmissions).catch(() => setSubmissions([]));
  }, []);

  const nextProblems = problems.slice(0, 3);
  const recentSubmissions = submissions.slice(0, 4);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
      <section className="flex flex-col justify-between gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <p className="text-sm text-zinc-500">@{user.username}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950">
            {user.displayName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdminUser(user) && (
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-100"
              href="/admin"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              管理ページ
            </Link>
          )}
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
            href="/problems"
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            問題一覧
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            href="/profile"
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            プロフィール
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Metric icon={<Trophy className="h-5 w-5" />} label="Rating" value={user.rating} />
        <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Solved" value={user.solvedCount} />
        <Metric icon={<FileCode2 className="h-5 w-5" />} label="Submissions" value={user.submissionsCount} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-950">おすすめ問題</h2>
            <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" href="/problems">
              すべて見る
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {nextProblems.map((problem) => (
              <Link
                className="flex items-center justify-between gap-3 py-3 text-sm hover:text-teal-700"
                href={`/problems/${problem.slug}`}
                key={problem.slug}
              >
                <span className="min-w-0 truncate font-medium">{problem.title}</span>
                <span className="shrink-0 text-zinc-500">{problem.score} pts</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-950">最近の提出</h2>
            <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" href="/profile">
              詳細
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {recentSubmissions.map((submission) => (
              <Link
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 text-sm"
                href={`/problems/${submission.problemSlug}`}
                key={submission.id}
              >
                <span className="min-w-0 truncate font-medium">{submission.problemTitle}</span>
                <SubmissionStatusBadge status={submission.status} />
                <ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
        {icon}
      </div>
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-950">{value.toLocaleString()}</div>
    </div>
  );
}
