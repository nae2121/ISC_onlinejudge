import { ShieldCheck } from "lucide-react";
import { PublicPageShell } from "@/components/PublicPageShell";

const privacyItems = [
  {
    body: "アカウント作成、ログイン、提出、プロフィール表示に必要な情報を取得します。",
    title: "取得する情報",
  },
  {
    body: "取得した情報は、認証、採点、ランキング、問い合わせ対応、サービス改善のために利用します。",
    title: "利用目的",
  },
  {
    body: "運営上必要な範囲を超えて、個人情報を第三者に提供しません。",
    title: "第三者提供",
  },
  {
    body: "不要になった情報は、運営方針とシステム保守の都合に合わせて削除または匿名化します。",
    title: "保管と削除",
  },
];

export default function PrivacyPage() {
  return (
    <PublicPageShell
      active="privacy"
      description="WfJ の利用に関わる情報の取り扱い方針です。"
      eyebrow="Privacy"
      title="Privacy Policy"
    >
      <div className="grid gap-4">
        {privacyItems.map((item) => (
          <article
            className="rounded-md border border-cyan-300/15 bg-[#06131c] p-5"
            key={item.title}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <h2 className="text-lg font-bold text-white">{item.title}</h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{item.body}</p>
          </article>
        ))}
      </div>
    </PublicPageShell>
  );
}
