"use client";

import { ArrowLeft, Clock, Database, Play } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import type { Problem } from "@/lib/api";
import { getProblem } from "@/lib/api";

export default function ProblemDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";

  return <ProtectedPage>{() => <ProblemDetailContent slug={slug} />}</ProtectedPage>;
}

function ProblemDetailContent({ slug }: { slug: string }) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProblem(slug)
      .then(setProblem)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="rounded-md border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          読み込み中
        </div>
      </main>
    );
  }

  if (!problem) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="rounded-md border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          問題が見つかりません。
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-5 px-4 py-6">
      <Link className="inline-flex items-center gap-2 text-sm font-medium text-teal-700" href="/problems">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        問題一覧
      </Link>

      <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="min-w-0">
            <p className="text-sm text-zinc-500">{problem.slug}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950">
              {problem.title}
            </h1>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
            href={`/playground?problem=${encodeURIComponent(problem.slug)}`}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            提出画面
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
          <span className="font-semibold text-zinc-950">{problem.score} pts</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {problem.timeLimitMs / 1000}s
          </span>
          <span className="inline-flex items-center gap-1">
            <Database className="h-4 w-4" aria-hidden="true" />
            {problem.memoryLimitMb}MB
          </span>
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-zinc-950">問題文</h2>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-zinc-800">
          {problem.statement}
        </pre>
      </section>
    </main>
  );
}
