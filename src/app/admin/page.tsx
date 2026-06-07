"use client";

import {
  ClipboardList,
  FileCode2,
  History,
  KeyRound,
  ListChecks,
  type LucideIcon,
  ServerCog,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import type { CurrentUser } from "@/lib/api";
import { isAdminUser } from "@/lib/api";

type AdminCard = {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
};

const adminCards: AdminCard[] = [
  {
    description: "問題の作成、編集、公開状態の管理",
    href: "/admin/problems",
    icon: FileCode2,
    label: "問題管理",
  },
  {
    description: "ユーザー情報、権限、利用状況の確認",
    href: "/admin/users",
    icon: Users,
    label: "ユーザー管理",
  },
  {
    description: "提出結果、採点状況、エラーの確認",
    href: "/admin/submissions",
    icon: ClipboardList,
    label: "提出一覧",
  },
  {
    description: "キュー、実行中ジョブ、失敗ジョブの監視",
    href: "/admin/judge-jobs",
    icon: ServerCog,
    label: "ジャッジジョブ管理",
  },
  {
    description: "開催予定、参加者、問題セットの管理",
    href: "/admin/contests",
    icon: Trophy,
    label: "コンテスト管理",
  },
  {
    description: "管理者による変更履歴と操作ログの確認",
    href: "/admin/audit-logs",
    icon: History,
    label: "管理者操作ログ",
  },
];

export default function AdminPage() {
  return (
    <ProtectedPage
      authorize={isAdminUser}
      loadingLabel="管理者権限を確認中"
      unauthorizedRedirectTo="/dashboard"
    >
      {(user) => <AdminContent user={user} />}
    </ProtectedPage>
  );
}

function AdminContent({ user }: { user: CurrentUser }) {
  const [registrationPin, setRegistrationPin] = useState("");

  useEffect(() => {
    let ignore = false;

    fetch("/api/admin/registration-pin", {
      cache: "no-store",
      credentials: "include",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (ignore || !payload || typeof payload !== "object") return;
        const source = payload as { pin_code?: unknown; pinCode?: unknown };
        const pin = source.pin_code ?? source.pinCode;
        if (typeof pin === "string") {
          setRegistrationPin(pin);
        }
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
      <section className="flex flex-col justify-between gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-teal-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin Console
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
            管理ページ
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            @{user.username} / {user.displayName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700">
            <KeyRound className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>PIN</span>
            <code className="font-mono text-zinc-950">{registrationPin || "-"}</code>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            href="/dashboard"
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {adminCards.map((card) => (
          <AdminLinkCard card={card} key={card.href} />
        ))}
      </section>
    </main>
  );
}

function AdminLinkCard({ card }: { card: AdminCard }) {
  const Icon = card.icon;

  return (
    <Link
      className="grid min-h-36 gap-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:border-teal-300 hover:bg-teal-50/30"
      href={card.href}
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
        <Icon className="h-5 w-5" aria-hidden={true} />
      </div>
      <div>
        <h2 className="text-base font-semibold text-zinc-950">{card.label}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">{card.description}</p>
      </div>
    </Link>
  );
}
