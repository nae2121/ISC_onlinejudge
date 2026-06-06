"use client";

import { useParams } from "next/navigation";
import { ProblemWorkspace } from "@/components/problem/ProblemWorkspace";
import { ProtectedPage } from "@/components/ProtectedPage";

export default function ProblemDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";

  return (
    <ProtectedPage showHeader={false}>
      {(user) => <ProblemWorkspace slug={decodeURIComponent(slug)} user={user} />}
    </ProtectedPage>
  );
}
