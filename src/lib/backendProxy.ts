import type { NextRequest } from "next/server";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL?.replace(/\/+$/, "") ?? "http://localhost:8080";
const BACKEND_API_TIMEOUT_MS = positiveIntEnv("BACKEND_API_TIMEOUT_MS", 15_000);

type ProxyOptions = {
  path: string;
  request: NextRequest;
};

export async function proxyBackend({ path, request }: ProxyOptions) {
  const target = new URL(`${BACKEND_API_URL}${path}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const cookie = request.headers.get("cookie");

  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (cookie) {
    headers.set("cookie", cookie);
  }

  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_API_TIMEOUT_MS),
    });
  } catch (error) {
    const message = backendErrorMessage(error);
    return Response.json(
      { error: `backend unavailable: ${message}` },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  const setCookies = getSetCookies(upstream.headers);

  if (upstreamContentType) {
    responseHeaders.set("content-type", upstreamContentType);
  }
  setCookies.forEach((value) => responseHeaders.append("set-cookie", value));

  if (upstream.status === 204 || upstream.status === 304) {
    return new Response(null, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  }

  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

function getSetCookies(headers: Headers) {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const values = withGetSetCookie.getSetCookie?.();
  if (values && values.length > 0) {
    return values;
  }

  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

function backendErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") {
    return `request timed out after ${BACKEND_API_TIMEOUT_MS}ms`;
  }
  return error instanceof Error ? error.message : String(error);
}

function positiveIntEnv(key: string, fallback: number) {
  const value = Number.parseInt(process.env[key] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
