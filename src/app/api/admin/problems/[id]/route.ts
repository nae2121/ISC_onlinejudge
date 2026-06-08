import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backendProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const upstream = await proxyBackend({
    path: `/api/admin/problems/${encodeURIComponent(id)}`,
    request,
  });

  if (upstream.status !== 404) {
    return upstream;
  }

  const publicProblems = await proxyBackend({ path: "/api/problems", request });
  if (!publicProblems.ok) {
    return upstream;
  }

  const problems = (await publicProblems.json().catch(() => [])) as unknown;
  const slug = findProblemSlugByID(problems, Number(id));
  if (!slug) {
    return upstream;
  }

  return proxyBackend({
    path: `/api/problems/${encodeURIComponent(slug)}`,
    request,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyBackend({
    path: `/api/admin/problems/${encodeURIComponent(id)}`,
    request,
  });
}

function findProblemSlugByID(value: unknown, id: number) {
  if (!Number.isFinite(id)) {
    return "";
  }

  const problems = Array.isArray(value)
    ? value
    : objectValue(value).problems;

  if (!Array.isArray(problems)) {
    return "";
  }

  for (const item of problems) {
    const problem = objectValue(item);
    if (problem.id === id && typeof problem.slug === "string") {
      return problem.slug;
    }
  }

  return "";
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
