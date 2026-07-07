import { passThrough, proxyError, serviceUrl, timeoutSignal } from "@/lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const upstream = await fetch(`${serviceUrl("demo")}/api/submit`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: timeoutSignal()
    });

    return passThrough(upstream);
  } catch (error) {
    return proxyError(error);
  }
}
