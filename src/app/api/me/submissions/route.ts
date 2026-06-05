import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backendProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return proxyBackend({ path: "/api/me/submissions", request });
}
