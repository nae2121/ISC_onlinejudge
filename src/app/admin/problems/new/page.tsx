"use client";

import { FilePlus2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminProblemForm } from "@/components/admin/AdminProblemForm";
import { ProtectedPage } from "@/components/ProtectedPage";
import type { AdminProblemInput } from "@/lib/adminProblems";
import { createAdminProblem } from "@/lib/adminProblems";
import { isAdminUser } from "@/lib/api";

export default function NewAdminProblemPage() {
  return (
    <ProtectedPage
      authorize={isAdminUser}
      loadingLabel="管理者権限を確認中"
      unauthorizedRedirectTo="/dashboard"
    >
      {() => <NewAdminProblemContent />}
    </ProtectedPage>
  );
}

function NewAdminProblemContent() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(input: AdminProblemInput) {
    setError("");
    setSaving(true);
    try {
      await createAdminProblem(input);
      router.push("/admin/problems");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "問題を作成できませんでした");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
      <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-teal-700">
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          Admin Console
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
          問題作成
        </h1>
      </section>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <AdminProblemForm mode="create" onSubmit={handleSubmit} saving={saving} />
    </main>
  );
}
