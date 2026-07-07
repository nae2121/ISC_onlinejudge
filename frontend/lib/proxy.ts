import { NextResponse } from "next/server";

const REQUEST_TIMEOUT_MS = 15_000;

export function serviceUrl(name: "demo" | "judge0") {
  const raw =
    name === "demo"
      ? process.env.DEMO_URL ?? "http://localhost:5000"
      : process.env.JUDGE0_URL ?? "http://localhost:2359";

  return raw.replace(/\/+$/, "");
}

export async function passThrough(upstream: Response) {
  const body = await upstream.arrayBuffer();
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  } else {
    headers.set("content-type", "application/json");
  }

  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

export function timeoutSignal() {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

export function proxyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status: 502 });
}

export function decodeSubmissionPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  const copy = Array.isArray(value)
    ? [...value]
    : { ...(value as Record<string, unknown>) };

  decodeFields(copy as Record<string, unknown>);

  const result = (copy as Record<string, unknown>).result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const resultCopy = { ...(result as Record<string, unknown>) };
    decodeFields(resultCopy);
    (copy as Record<string, unknown>).result = resultCopy;
  }

  return copy;
}

function decodeFields(target: Record<string, unknown>) {
  for (const key of ["stdout", "stderr", "compile_output", "message"] as const) {
    const decoded = tryDecodeBase64(target[key]);
    if (decoded === null) {
      continue;
    }

    target[key] = decoded;
    target[`decoded_${key}`] = decoded;
  }
}

function tryDecodeBase64(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const compact = value.trim().replace(/\s+/g, "");
  if (!compact || compact.length % 4 !== 0) {
    return null;
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    return null;
  }

  try {
    const bytes = Buffer.from(compact, "base64");
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
