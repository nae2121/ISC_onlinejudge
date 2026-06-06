"use client";

import { useEffect, useState } from "react";
import { ProblemList } from "@/components/ProblemList";
import { ProtectedPage } from "@/components/ProtectedPage";
import type { Problem } from "@/lib/api";
import { getMySubmissions, getProblems } from "@/lib/api";

export default function ProblemsPage() {
  return <ProtectedPage>{() => <ProblemsContent />}</ProtectedPage>;
}

function ProblemsContent() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProblems(), getMySubmissions().catch(() => [])])
      .then(([nextProblems, submissions]) => {
        const solvedKeys = new Set(
          submissions
            .filter((submission) => submission.status === "AC")
            .flatMap((submission) => [
              submission.problemSlug,
              submission.problemId ? String(submission.problemId) : "",
            ])
            .filter(Boolean)
        );
        setProblems(
          nextProblems.map((problem) => ({
            ...problem,
            solved: solvedKeys.has(problem.slug) || solvedKeys.has(String(problem.id)),
          }))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">問題一覧</h1>
        <p className="mt-1 text-sm text-zinc-500">{problems.length} problems</p>
      </div>
      {loading ? (
        <div className="rounded-md border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          読み込み中
        </div>
      ) : (
        <ProblemList problems={problems} />
      )}
    </main>
  );
}
