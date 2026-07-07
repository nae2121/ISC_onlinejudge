import {
  decodeSubmissionPayload,
  passThrough,
  proxyError,
  serviceUrl,
  timeoutSignal
} from "@/lib/proxy";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const autoDecode = searchParams.get("auto_decode") !== "false";
    const upstream = await fetch(
      `${serviceUrl("demo")}/api/result/${encodeURIComponent(token)}`,
      {
        cache: "no-store",
        signal: timeoutSignal()
      }
    );

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!autoDecode || !contentType.toLowerCase().includes("application/json")) {
      return passThrough(upstream);
    }

    const payload = decodeSubmissionPayload(await upstream.json());
    return Response.json(payload, { status: upstream.status });
  } catch (error) {
    return proxyError(error);
  }
}
