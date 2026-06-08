"use client";

import { FilePenLine, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminProblemForm } from "@/components/admin/AdminProblemForm";
import { ProtectedPage } from "@/components/ProtectedPage";
import type { AdminProblem, AdminProblemInput } from "@/lib/adminProblems";
import { getAdminProblem, updateAdminProblem } from "@/lib/adminProblems";
import { isAdminUser } from "@/lib/api";

export default function EditAdminProblemPage() {
  return (
    <ProtectedPage
      authorize={isAdminUser}
      loadingLabel="管理者権限を確認中"
      unauthorizedRedirectTo="/dashboard"
    >
      {() => <EditAdminProblemContent />}
    </ProtectedPage>
  );
}

function EditAdminProblemContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const problemId = Number(params.id);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<AdminProblem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProblem() {
      setLoading(true);
      setError("");
      try {
        const nextProblem = await getAdminProblem(problemId);
        if (!ignore) {
          setProblem(nextProblem);
        }
      } catch (cause) {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : "問題を取得できませんでした");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (Number.isFinite(problemId) && problemId > 0) {
      loadProblem();
    } else {
      setError("問題IDが不正です");
      setLoading(false);
    }

    return () => {
      ignore = true;
    };
  }, [problemId]);

  async function handleSubmit(input: AdminProblemInput) {
    setError("");
    setSaving(true);
    try {
      await updateAdminProblem(problemId, input);
      router.push("/admin/problems");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "問題を保存できませんでした");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
      <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-teal-700">
          <FilePenLine className="h-4 w-4" aria-hidden="true" />
          Admin Console
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
          問題編集
        </h1>
        {problem ? (
          <p className="mt-1 text-sm text-zinc-500">
            #{problem.id} / {problem.slug}
          </p>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          読み込み中
        </div>
      ) : problem ? (
        <AdminProblemForm
          initialProblem={problem}
          mode="edit"
          onSubmit={handleSubmit}
          saving={saving}
        />
      ) : null}
    </main>
  );
}
