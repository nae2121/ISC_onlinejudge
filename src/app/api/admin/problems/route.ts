import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backendProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const upstream = await proxyBackend({ path: "/api/admin/problems", request });
  if (upstream.status !== 404) {
    return upstream;
  }

  return proxyBackend({ path: "/api/problems", request });
}

export function POST(request: NextRequest) {
  return proxyBackend({ path: "/api/admin/problems", request });
}
