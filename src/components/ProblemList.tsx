"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Problem } from "@/lib/api";
import { ProblemCard } from "@/components/ProblemCard";

const difficulties = ["all", "beginner", "easy", "medium", "hard"] as const;

export function ProblemList({ problems }: { problems: Problem[] }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]>("all");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return problems.filter((problem) => {
      const matchesDifficulty = difficulty === "all" || problem.difficulty === difficulty;
      const matchesQuery =
        !normalizedQuery ||
        problem.title.toLowerCase().includes(normalizedQuery) ||
        problem.slug.toLowerCase().includes(normalizedQuery) ||
        problem.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      return matchesDifficulty && matchesQuery;
    });
  }, [difficulty, problems, query]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-3 shadow-sm md:flex-row md:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            className="h-10 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="問題名、slug、tag"
            value={query}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {difficulties.map((item) => (
            <button
              className={`h-9 rounded-md border px-3 text-sm ${
                difficulty === item
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
              key={item}
              onClick={() => setDifficulty(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((problem) => (
          <ProblemCard key={problem.slug} problem={problem} />
        ))}
        {filtered.length === 0 ? (
          <div className="rounded-md border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            該当する問題はありません。
          </div>
        ) : null}
      </div>
    </div>
  );
}
