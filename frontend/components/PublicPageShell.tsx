import type { ReactNode } from "react";
import { PublicFooter, PublicHeader } from "@/components/PublicHeader";

type PublicPageShellProps = {
  active: "members" | "terms" | "privacy" | "changelog";
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function PublicPageShell({
  active,
  children,
  description,
  eyebrow,
  title,
}: PublicPageShellProps) {
  return (
    <main className="min-h-dvh bg-[#02070c] text-zinc-50">
      <PublicHeader active={active} />
      <section className="public-cyber-bg relative overflow-hidden border-b border-cyan-300/10">
        <div className="relative mx-auto grid w-full max-w-5xl gap-8 px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-3xl">
            <p className="font-mono text-sm uppercase tracking-[0.24em] text-cyan-300">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-normal text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-base leading-8 text-zinc-300 sm:text-lg">{description}</p>
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        {children}
      </section>
      <PublicFooter />
    </main>
  );
}
