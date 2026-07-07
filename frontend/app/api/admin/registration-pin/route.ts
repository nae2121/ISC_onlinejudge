import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backendProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL?.replace(/\/+$/, "") ?? "http://localhost:8080";

export async function GET(request: NextRequest) {
  const upstream = await proxyBackend({ path: "/api/admin/registration-pin", request });
  if (upstream.status !== 404) {
    return upstream;
  }

  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "admin permission required" }, { status: 403 });
  }

  return Response.json({
    pin_code: process.env.APP_REGISTRATION_PIN_CODE ?? "1234",
  });
}

async function isAdminRequest(request: NextRequest) {
  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return false;
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}/api/auth/me`, {
      cache: "no-store",
      headers: { cookie },
    });
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as unknown;
    const source = objectValue(payload);
    const user = objectValue(source.user ?? source);
    return user.role === "admin";
  } catch {
    return false;
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
