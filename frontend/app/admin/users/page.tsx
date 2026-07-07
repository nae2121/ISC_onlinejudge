"use client";

import {
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import type { AdminUser } from "@/lib/api";
import { isAdminUser } from "@/lib/api";

const statusClasses: Record<AdminUser["status"], string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  suspended: "border-rose-200 bg-rose-50 text-rose-700",
};

function displayStatus(user: AdminUser): AdminUser["status"] {
  if (user.role === "admin") return "active";
  if (user.status === "suspended") return "suspended";
  return user.isActive ? "active" : "pending";
}

export default function AdminUsersPage() {
  return (
    <ProtectedPage
      authorize={isAdminUser}
      loadingLabel="管理者権限を確認中"
      unauthorizedRedirectTo="/dashboard"
    >
      {() => <AdminUsersContent />}
    </ProtectedPage>
  );
}

function AdminUsersContent() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [registrationPin, setRegistrationPin] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingActiveId, setUpdatingActiveId] = useState<number | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    refreshUsers();
  }, []);

  async function refreshUsers() {
    setLoading(true);
    setError("");
    try {
      setUsers(await getAdminUsers());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ユーザー一覧を取得できませんでした");
    } finally {
      setLoading(false);
    }

    try {
      setRegistrationPin(await getRegistrationPin());
    } catch {
      setRegistrationPin("");
    }
  }

  async function handleActiveToggle(user: AdminUser, nextIsActive: boolean) {
    setUpdatingActiveId(user.id);
    setError("");
    setSuccess("");
    try {
      const approved = await updateAdminUserActive(user.id, nextIsActive);
      setUsers((current) =>
        current.map((item) => (item.id === approved.id ? approved : item))
      );
      setSuccess(
        `${user.username} を ${nextIsActive ? "active" : "pending"} にしました。`
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "承認状態の更新に失敗しました");
    } finally {
      setUpdatingActiveId(null);
    }
  }

  function handlePasswordChanged(user: AdminUser) {
    setSuccess(`${user.username} のパスワードを変更しました。`);
    setPasswordTarget(null);
  }

  const pendingCount = users.filter((user) => displayStatus(user) === "pending").length;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
      <section className="flex flex-col justify-between gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-teal-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin Console
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
            ユーザー管理
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            登録申請の承認、ユーザー状態の確認、パスワード変更を行います。
          </p>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <Metric label="Users" value={users.length} />
          <Metric label="Pending" value={pendingCount} />
          <PinMetric value={registrationPin} />
        </div>
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

      <section className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-zinc-950">
            <Users className="h-5 w-5 text-teal-700" aria-hidden="true" />
            ユーザー一覧
          </h2>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
            disabled={loading}
            onClick={refreshUsers}
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
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            ユーザーはまだありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Approved</th>
                  <th className="w-[260px] px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-950">{user.displayName || user.username}</div>
                      <div className="text-xs text-zinc-500">@{user.username}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{user.email}</td>
                    <td className="px-4 py-3 text-zinc-600">{user.role}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={displayStatus(user)} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {user.approvedAt ? new Date(user.approvedAt).toLocaleString("ja-JP") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-nowrap items-center justify-end gap-2">
                        {user.role !== "admin" ? (
                          <ActiveSwitch
                            checked={displayStatus(user) === "active"}
                            disabled={updatingActiveId === user.id}
                            loading={updatingActiveId === user.id}
                            onChange={(checked) => handleActiveToggle(user, checked)}
                          />
                        ) : null}
                        <button
                          className="inline-flex h-9 min-w-[144px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                          onClick={() => setPasswordTarget(user)}
                          type="button"
                        >
                          <KeyRound className="h-4 w-4" aria-hidden="true" />
                          パスワード変更
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {passwordTarget ? (
        <PasswordModal
          onChanged={handlePasswordChanged}
          onClose={() => setPasswordTarget(null)}
          user={passwordTarget}
        />
      ) : null}
    </main>
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

function PinMetric({ value }: { value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs uppercase text-zinc-500">Registration PIN</div>
      <div className="mt-1 font-mono text-2xl font-semibold text-zinc-950">
        {value || "-"}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminUser["status"] }) {
  return (
    <span
      className={`inline-flex h-7 min-w-20 items-center justify-center rounded-md border px-2 text-xs font-semibold ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}

function ActiveSwitch({
  checked,
  disabled,
  loading,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  loading: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={`inline-flex h-9 w-[92px] shrink-0 items-center justify-between rounded-md border border-zinc-200 bg-white px-2 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <span className="text-xs font-semibold text-zinc-600">承認</span>
      <button
        aria-checked={checked}
        aria-label={checked ? "承認を解除" : "承認する"}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-wait ${
          checked ? "bg-teal-600" : "bg-zinc-300"
        }`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
        {loading ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/10">
            <Loader2 className="h-3 w-3 animate-spin text-white" aria-hidden="true" />
          </span>
        ) : null}
      </button>
    </div>
  );
}

function PasswordModal({
  onChanged,
  onClose,
  user,
}: {
  onChanged: (user: AdminUser) => void;
  onClose: () => void;
  user: AdminUser;
}) {
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      await changeAdminUserPassword(user.id, password);
      onChanged(user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "パスワード変更に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 py-[10vh]">
      <div className="w-full max-w-md rounded-md border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">パスワード変更</h2>
            <p className="mt-1 text-sm text-zinc-500">@{user.username}</p>
          </div>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 p-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              新しいパスワード
            </span>
            <input
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            onClick={onClose}
            type="button"
          >
            キャンセル
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
            disabled={saving || password.length < 8}
            onClick={handleSave}
            type="button"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

async function getAdminUsers() {
  const payload = await adminRequest<unknown>("/api/admin/users");
  const source = objectValue(payload);
  const users = Array.isArray(payload)
    ? payload
    : Array.isArray(source.users)
      ? source.users
      : [];
  return users.map(normalizeAdminUser);
}

async function getRegistrationPin() {
  const payload = await adminRequest<unknown>("/api/admin/registration-pin");
  const source = objectValue(payload);
  return stringValue(source.pin_code ?? source.pinCode, "");
}

async function updateAdminUserActive(id: number, isActive: boolean) {
  const payload = await adminRequest<unknown>(
    `/api/admin/users/${encodeURIComponent(String(id))}/active`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    }
  );
  return normalizeAdminUser(payload);
}

async function changeAdminUserPassword(id: number, password: string) {
  await adminRequest(`/api/admin/users/${encodeURIComponent(String(id))}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

async function adminRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function responseErrorMessage(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) {
    return response.statusText || "リクエストに失敗しました";
  }

  try {
    const payload = JSON.parse(text) as unknown;
    const source = objectValue(payload);
    return stringValue(source.error ?? source.message, text);
  } catch {
    return text;
  }
}

function normalizeAdminUser(value: unknown): AdminUser {
  const source = objectValue(value);
  const user = objectValue(source.user);
  const target = Object.keys(user).length > 0 ? user : source;
  const role = roleValue(target.role);
  const isActive = role === "admin"
    ? true
    : booleanValue(target.is_active ?? target.isActive, false);

  return {
    id: numberValue(target.id, 0),
    username: stringValue(target.username, ""),
    displayName: stringValue(target.display_name ?? target.displayName, ""),
    email: stringValue(target.email, ""),
    role,
    status: role === "admin"
      ? "active"
      : adminUserStatusValue(target.status, isActive ? "active" : "pending"),
    isActive,
    approvedAt: optionalString(target.approved_at ?? target.approvedAt),
    approvedBy: optionalNumber(target.approved_by ?? target.approvedBy),
    pinVerifiedAt: optionalString(target.pin_verified_at ?? target.pinVerifiedAt),
    createdAt: optionalString(target.created_at ?? target.createdAt),
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function roleValue(value: unknown): AdminUser["role"] {
  return value === "admin" ||
    value === "problem_setter" ||
    value === "judge_admin" ||
    value === "user"
    ? value
    : "user";
}

function adminUserStatusValue(
  value: unknown,
  fallback: AdminUser["status"] = "pending"
): AdminUser["status"] {
  return value === "pending" || value === "active" || value === "suspended"
    ? value
    : fallback;
}
