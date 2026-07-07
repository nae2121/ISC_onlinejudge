import { Sparkles } from "lucide-react";
import { PublicPageShell } from "@/components/PublicPageShell";

const changes = [
  {
    date: "2026-07-07",
    items: ["公開トップページを追加", "公開ヘッダーを追加", "メンバー、規約、プライバシー、更新履歴ページを追加"],
    version: "v0.1.0",
  },
];

export default function ChangelogPage() {
  return (
    <PublicPageShell
      active="changelog"
      description="WfJ の公開ページとオンラインジャッジ機能の変更履歴です。"
      eyebrow="Release Notes"
      title="Changelog"
    >
      <div className="grid gap-4">
        {changes.map((change) => (
          <article
            className="rounded-md border border-cyan-300/15 bg-[#06131c] p-5"
            key={change.version}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Sparkles className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <h2 className="text-xl font-bold text-white">{change.version}</h2>
              <span className="font-mono text-sm text-zinc-500">{change.date}</span>
            </div>
            <ul className="mt-4 grid gap-2 text-sm leading-7 text-zinc-400">
              {change.items.map((item) => (
                <li className="flex gap-2" key={item}>
                  <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </PublicPageShell>
  );
}
