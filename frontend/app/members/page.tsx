import { Github, Link as LinkIcon, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { PublicPageShell } from "@/components/PublicPageShell";

const profileSlots = [
  "代表 / 運営",
  "問題作成",
  "バックエンド / インフラ",
  "フロントエンド",
  "AI / セキュリティ",
  "ビギナーサポート",
];

export default function MembersPage() {
  return (
    <PublicPageShell
      active="members"
      description="WfJ で活動するメンバー紹介ページです。公開用プロフィールの準備ができ次第、順次掲載します。"
      eyebrow="WfJ Members"
      title="Members"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profileSlots.map((role) => (
          <article
            className="rounded-md border border-cyan-300/15 bg-[#06131c] p-5 shadow-[0_0_32px_rgba(20,241,216,0.06)]"
            key={role}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                <Users className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">{role}</h2>
                <p className="mt-1 font-mono text-xs text-cyan-300">coming soon</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-zinc-400">
              掲載する名前、役割、得意分野、リンクを確認中です。
            </p>
            <div className="mt-5 flex gap-2 text-zinc-500">
              <Github className="h-5 w-5" aria-hidden="true" />
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              <LinkIcon className="h-5 w-5" aria-hidden="true" />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-md border border-cyan-300/15 bg-cyan-300/[0.035] p-6">
        <h2 className="text-xl font-bold text-white">Join WfJ</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          競技プログラミング、Web 開発、セキュリティ、AI に興味があるメンバーを歓迎しています。
        </p>
        <Link
          className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-cyan-300 px-4 text-sm font-bold text-[#02110f] hover:bg-cyan-200"
          href="/register"
        >
          Join
        </Link>
      </div>
    </PublicPageShell>
  );
}
