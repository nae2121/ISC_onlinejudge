import { passThrough, proxyError, serviceUrl, timeoutSignal } from "@/lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upstream = await fetch(`${serviceUrl("judge0")}/languages`, {
      cache: "no-store",
      signal: timeoutSignal()
    });

    return passThrough(upstream);
  } catch (error) {
    return proxyError(error);
  }
}
