"use client";

import {
  Archive,
  ClipboardCopy,
  Eye,
  EyeOff,
  FileCode2,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import type { AdminProblem, AdminProblemStatus } from "@/lib/adminProblems";
import {
  archiveAdminProblem,
  copyAdminProblem,
  getAdminProblems,
  publishAdminProblem,
  unpublishAdminProblem,
} from "@/lib/adminProblems";
import { isAdminUser } from "@/lib/api";

const statusFilters: Array<{ label: string; value: AdminProblemStatus | "all" }> = [
  { label: "すべて", value: "all" },
  { label: "公開中", value: "public" },
  { label: "非公開", value: "private" },
  { label: "下書き", value: "draft" },
  { label: "アーカイブ", value: "archived" },
];

const statusLabels: Record<AdminProblemStatus, string> = {
  public: "公開中",
  private: "非公開",
  draft: "下書き",
  archived: "アーカイブ",
};

const statusClasses: Record<AdminProblemStatus, string> = {
  public: "border-emerald-200 bg-emerald-50 text-emerald-700",
  private: "border-zinc-200 bg-zinc-50 text-zinc-600",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
  archived: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function AdminProblemsPage() {
  return (
    <ProtectedPage
      authorize={isAdminUser}
      loadingLabel="管理者権限を確認中"
      unauthorizedRedirectTo="/dashboard"
    >
      {() => <AdminProblemsContent />}
    </ProtectedPage>
  );
}

function AdminProblemsContent() {
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AdminProblemStatus | "all">("all");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    refreshProblems();
  }, []);

  async function refreshProblems() {
    setLoading(true);
    setError("");
    try {
      setProblems(await getAdminProblems());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "問題一覧を取得できませんでした");
    } finally {
      setLoading(false);
    }
  }

  const filteredProblems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return problems.filter((problem) => {
      const statusMatches = status === "all" || problem.status === status;
      if (!statusMatches) return false;
      if (!needle) return true;
      return [
        problem.title,
        problem.slug,
        problem.problemCode,
        ...problem.tags,
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [problems, query, status]);

  const counts = useMemo(
    () => ({
      archived: problems.filter((problem) => problem.status === "archived").length,
      draft: problems.filter((problem) => problem.status === "draft").length,
      private: problems.filter((problem) => problem.status === "private").length,
      public: problems.filter((problem) => problem.status === "public").length,
    }),
    [problems]
  );

  async function runProblemAction(
    problem: AdminProblem,
    action: "publish" | "unpublish" | "archive" | "copy"
  ) {
    if (action === "publish") {
      const issues = publishIssues(problem);
      if (issues.length > 0) {
        setError(`公開前チェック: ${issues.join("、")}`);
        return;
      }
    }

    if (action === "archive" && !window.confirm(`${problem.title} をアーカイブしますか？`)) {
      return;
    }

    setActionId(`${problem.id}:${action}`);
    setError("");
    setSuccess("");
    try {
      if (action === "publish") {
        await publishAdminProblem(problem.id);
        setSuccess(`${problem.title} を公開しました。`);
      } else if (action === "unpublish") {
        await unpublishAdminProblem(problem.id);
        setSuccess(`${problem.title} を非公開にしました。`);
      } else if (action === "archive") {
        await archiveAdminProblem(problem.id);
        setSuccess(`${problem.title} をアーカイブしました。`);
      } else {
        await copyAdminProblem(problem.id);
        setSuccess(`${problem.title} をコピーしました。`);
      }
      await refreshProblems();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作に失敗しました");
    } finally {
      setActionId("");
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6">
      <section className="flex flex-col justify-between gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-teal-700">
            <FileCode2 className="h-4 w-4" aria-hidden="true" />
            Admin Console
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
            問題管理
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            問題の作成、編集、公開状態、テストケース導線を管理します。
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
          href="/admin/problems/new"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          新規作成
        </Link>
      </section>

      <section className="grid gap-2 text-sm sm:grid-cols-4">
        <Metric label="公開中" value={counts.public} />
        <Metric label="非公開" value={counts.private} />
        <Metric label="下書き" value={counts.draft} />
        <Metric label="アーカイブ" value={counts.archived} />
      </section>

      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-zinc-200 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <input
              className="h-10 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="タイトル、slug、問題コード、タグで検索"
              value={query}
            />
          </label>

          <select
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setStatus(event.target.value as AdminProblemStatus | "all")}
            value={status}
          >
            {statusFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
            disabled={loading}
            onClick={refreshProblems}
            type="button"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            再読み込み
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            読み込み中
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            条件に一致する問題はありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tests</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="w-[380px] px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredProblems.map((problem) => (
                  <tr key={problem.id}>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {problem.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-950">{problem.title || "-"}</div>
                      <div className="text-xs text-zinc-500">{problem.problemCode || "-"}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                      {problem.slug || "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{problem.score}</td>
                    <td className="px-4 py-3 text-zinc-600">{problem.difficulty}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={problem.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {problem.testCaseCount}
                      <span className="ml-1 text-xs text-zinc-400">
                        P{problem.sampleCaseCount} / H{problem.hiddenCaseCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(problem.createdAt)}</td>
                    <td className="px-4 py-3">
                      <ProblemActions
                        actionId={actionId}
                        onAction={runProblemAction}
                        problem={problem}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function ProblemActions({
  actionId,
  onAction,
  problem,
}: {
  actionId: string;
  onAction: (
    problem: AdminProblem,
    action: "publish" | "unpublish" | "archive" | "copy"
  ) => void;
  problem: AdminProblem;
}) {
  const publishing = actionId === `${problem.id}:publish`;
  const unpublishing = actionId === `${problem.id}:unpublish`;
  const archiving = actionId === `${problem.id}:archive`;
  const copying = actionId === `${problem.id}:copy`;

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <ActionLink href={`/admin/problems/${problem.id}/edit`} icon={Pencil} label="編集" />
      {problem.status === "public" ? (
        <ActionButton
          icon={EyeOff}
          label="非公開"
          loading={unpublishing}
          onClick={() => onAction(problem, "unpublish")}
        />
      ) : (
        <ActionButton
          icon={Eye}
          label="公開"
          loading={publishing}
          onClick={() => onAction(problem, "publish")}
        />
      )}
      <ActionButton
        icon={Archive}
        label="アーカイブ"
        loading={archiving}
        onClick={() => onAction(problem, "archive")}
      />
      <ActionLink href={`/admin/problems/${problem.id}/test-cases`} label="テストケース" />
      <ActionLink href={`/admin/problems/${problem.id}/test-cases?upload=zip`} icon={Upload} label="ZIP" />
      <ActionLink href={`/admin/problems/${problem.id}/rejudge`} icon={RotateCcw} label="再ジャッジ" />
      <ActionButton
        icon={ClipboardCopy}
        label="コピー"
        loading={copying}
        onClick={() => onAction(problem, "copy")}
      />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  loading,
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
      disabled={loading}
      onClick={onClick}
      type="button"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {label}
    </button>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon?: typeof Eye;
  label: string;
}) {
  return (
    <Link
      className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
      href={href}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {label}
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-950">{value.toLocaleString()}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminProblemStatus }) {
  return (
    <span
      className={`inline-flex h-7 min-w-20 items-center justify-center rounded-md border px-2 text-xs font-semibold ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function publishIssues(problem: AdminProblem) {
  const issues: string[] = [];
  if (!problem.title.trim()) issues.push("タイトルがありません");
  if (!problem.slug.trim()) issues.push("slugがありません");
  if (!problem.statement.trim()) issues.push("問題文がありません");
  if (problem.timeLimitMs <= 0) issues.push("実行時間制限がありません");
  if (problem.memoryLimitMb <= 0) issues.push("メモリ制限がありません");
  if (problem.sampleCaseCount <= 0) issues.push("公開テストケースがありません");
  return issues;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ja-JP");
}
