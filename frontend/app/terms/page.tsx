import { FileText } from "lucide-react";
import { PublicPageShell } from "@/components/PublicPageShell";

const terms = [
  {
    body: "WfJ は ISC の学習とコンテスト運営のために提供されます。利用者は、管理者が定める範囲で問題閲覧、提出、ランキング機能を利用できます。",
    title: "サービスの目的",
  },
  {
    body: "他者のアカウント利用、不正な提出、ジャッジ環境への攻撃、過度な負荷をかける行為は禁止します。",
    title: "禁止事項",
  },
  {
    body: "提出されたコード、問題文、テストケース、解説などは、学習支援と運営改善のために確認される場合があります。",
    title: "コンテンツの取り扱い",
  },
  {
    body: "メンテナンス、障害対応、運営上の判断により、機能の停止やアカウント制限を行う場合があります。",
    title: "運営上の対応",
  },
];

export default function TermsPage() {
  return (
    <PublicPageShell
      active="terms"
      description="WfJ を利用するための基本ルールです。正式運用に合わせて内容は更新されます。"
      eyebrow="Terms"
      title="Terms of Service"
    >
      <div className="grid gap-4">
        {terms.map((item) => (
          <article
            className="rounded-md border border-cyan-300/15 bg-[#06131c] p-5"
            key={item.title}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <h2 className="text-lg font-bold text-white">{item.title}</h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{item.body}</p>
          </article>
        ))}
      </div>
    </PublicPageShell>
  );
}
