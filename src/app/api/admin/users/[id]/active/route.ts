import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backendProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyBackend({
    path: `/api/admin/users/${encodeURIComponent(id)}/active`,
    request,
  });
}
