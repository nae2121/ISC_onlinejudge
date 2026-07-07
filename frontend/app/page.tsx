import {
  Activity,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/PublicHeader";

const featureItems = [
  {
    description: "Solve quality problems and get fast feedback on every submission.",
    icon: CheckCircle2,
    title: "Problems",
  },
  {
    description: "Compete on leaderboards and track your progress with ratings.",
    icon: Trophy,
    title: "Contests",
  },
  {
    description: "Visualize your submissions, runtime, and memory usage at a glance.",
    icon: Activity,
    title: "Analytics",
  },
  {
    description: "Execute code safely in an isolated judging environment.",
    icon: LockKeyhole,
    title: "Sandbox",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[#02070c] text-zinc-50">
      <PublicHeader active="home" />

      <section className="public-cyber-bg relative isolate overflow-hidden border-b border-cyan-300/10">
        <div className="absolute left-4 top-12 hidden w-72 rounded-md border border-cyan-300/10 bg-black/20 p-5 font-mono text-xs leading-6 text-cyan-300/45 shadow-[0_0_45px_rgba(20,241,216,0.08)] lg:block">
          <p>#include &lt;bits/stdc++.h&gt;</p>
          <p>using namespace std;</p>
          <p>int main() {"{"}</p>
          <p className="pl-4">ios::sync_with_stdio(false);</p>
          <p className="pl-4">cout &lt;&lt; judge.submit();</p>
          <p>{"}"}</p>
        </div>

        <div className="absolute right-8 top-20 hidden w-72 rounded-md border border-cyan-300/10 bg-black/20 p-5 font-mono text-xs leading-6 text-cyan-300/45 shadow-[0_0_45px_rgba(20,241,216,0.08)] xl:block">
          <p>for (int i = 0; i &lt; n; ++i) {"{"}</p>
          <p className="pl-4">cin &gt;&gt; a[i];</p>
          <p>{"}"}</p>
          <p>sort(a, a + n);</p>
          <p>cout &lt;&lt; score &lt;&lt; '\n';</p>
        </div>

        <div className="relative mx-auto grid min-h-[calc(100svh-126px)] w-full max-w-7xl place-items-center px-4 py-10 sm:px-6 lg:py-12">
          <div className="w-full">
            <div className="max-w-3xl">
              <div>
                <p className="font-mono text-sm uppercase tracking-[0.24em] text-cyan-300">
                  Build. Submit. Improve.
                </p>
                <h1 className="mt-4 text-3xl font-black tracking-normal text-white sm:text-4xl">
                  ISC Online Judge  Learn Challenge Improve
                </h1>
                <p className="mt-5 text-base leading-8 text-zinc-300">
                  WfJ is an online judge platform that connects problem solving, submissions, judging results, and rankings in one smooth experience. From everyday practice to small contests, it provides the foundation for ISC’s programming activities.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featureItems.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.045] p-5 shadow-[0_0_32px_rgba(20,241,216,0.06)]"
                    key={item.title}
                  >
                    <Icon className="h-7 w-7 text-cyan-300" aria-hidden="true" />
                    <h2 className="mt-4 text-base font-bold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 text-sm font-bold text-[#02110f] shadow-[0_0_28px_rgba(20,241,216,0.28)] transition hover:bg-cyan-200 sm:w-auto"
                href="/register"
              >
                Join WfJ
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-cyan-300/45 bg-cyan-300/5 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/10 sm:w-auto"
                href="/login"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
