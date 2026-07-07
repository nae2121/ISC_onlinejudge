"use client";

import { CheckCircle2, Gauge, Mail, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { SubmissionStatusBadge } from "@/components/SubmissionStatusBadge";
import type { CurrentUser, Submission } from "@/lib/api";
import { getMySubmissions, getProfile } from "@/lib/api";

export default function ProfilePage() {
  return <ProtectedPage>{(user) => <ProfileContent user={user} />}</ProtectedPage>;
}

function ProfileContent({ user }: { user: CurrentUser }) {
  const [profile, setProfile] = useState<CurrentUser>(user);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    getProfile().then((nextProfile) => {
      if (nextProfile) {
        setProfile(nextProfile);
      }
    });
    getMySubmissions().then(setSubmissions).catch(() => setSubmissions([]));
  }, []);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6">
      <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-zinc-500">@{profile.username}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950">
              {profile.displayName}
            </h1>
          </div>
          <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              {profile.email}
            </span>
            <span className="inline-flex items-center gap-2">
              <Gauge className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              {profile.rating}
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              {profile.solvedCount} solved
            </span>
            <span className="inline-flex items-center gap-2">
              <Trophy className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              {profile.points} pts
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-950">提出履歴</h2>
          <span className="text-sm text-zinc-500">{submissions.length} submissions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-2 pr-3 font-medium">Problem</th>
                <th className="py-2 pr-3 font-medium">Language</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Score</th>
                <th className="py-2 pr-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td className="py-3 pr-3">
                    <Link
                      className="font-medium text-zinc-950 hover:text-teal-700"
                      href={`/problems/${submission.problemSlug}`}
                    >
                      {submission.problemTitle}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-zinc-600">{submission.language}</td>
                  <td className="py-3 pr-3">
                    <SubmissionStatusBadge status={submission.status} />
                  </td>
                  <td className="py-3 pr-3 text-zinc-600">{submission.score}</td>
                  <td className="py-3 pr-3 text-zinc-500">
                    {new Date(submission.submittedAt).toLocaleString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
