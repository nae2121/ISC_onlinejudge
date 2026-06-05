import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backendProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return proxyBackend({
    path: `/api/problems/${encodeURIComponent(slug)}`,
    request,
  });
}
