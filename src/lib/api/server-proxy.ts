import { isIP } from "node:net";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8090";
const MAX_BODY_BYTES = 64 * 1024;
const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
};

type ProxyOptions = {
  path: string;
  token: string | null;
  request: Request;
  fetcher?: typeof fetch;
  trustedClientIPHeader?: string;
};

type StreamProxyOptions = Pick<ProxyOptions, "path" | "token" | "request" | "fetcher">;

/**
 * The authenticated BFF boundary: browser cookies stay in Next.js; only a
 * short-lived Clerk bearer token crosses to the Go backend.
 */
export async function proxyAuthenticated({
  path,
  token,
  request,
  fetcher = fetch,
  trustedClientIPHeader = process.env.TRUSTED_CLIENT_IP_HEADER,
}: ProxyOptions): Promise<Response> {
  if (!token) {
    return privateJSON({ error: { message: "Authentication required" } }, 401);
  }

  const contentType = request.headers.get("content-type");
  const userAgent = request.headers.get("user-agent")?.slice(0, 512);
  const clientIP = readTrustedClientIP(request, trustedClientIPHeader);
  const method = request.method.toUpperCase();
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return privateJSON({ error: { message: "Request body is too large" } }, 413);
  }
  if (method !== "GET" && method !== "HEAD" && contentType !== "application/json") {
    return privateJSON({ error: { message: "Content-Type must be application/json" } }, 415);
  }
  const body = method === "GET" || method === "HEAD" ? undefined : await request.text();
  if (body && new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return privateJSON({ error: { message: "Request body is too large" } }, 413);
  }
  let response: Response;
  try {
    response = await fetcher(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(userAgent ? { "User-Agent": userAgent } : {}),
        ...(clientIP ? { "X-Forwarded-For": clientIP } : {}),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return privateJSON({ error: { message: "Backend unavailable" } }, 502);
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
	  ...(response.headers.get("x-request-id") ? { "X-Request-ID": response.headers.get("x-request-id")! } : {}),
      ...PRIVATE_RESPONSE_HEADERS,
    },
  });
}

/** Streams an authenticated backend response without buffering or a short request timeout. */
export async function proxyAuthenticatedStream({
  path,
  token,
  request,
  fetcher = fetch,
}: StreamProxyOptions): Promise<Response> {
  if (!token) {
    return privateJSON({ error: { message: "Authentication required" } }, 401);
  }

  let response: Response;
  try {
    response = await fetcher(`${BACKEND_URL}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      cache: "no-store",
      signal: request.signal,
    });
  } catch {
    return privateJSON({ error: { message: "Backend unavailable" } }, 502);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (response.ok && !contentType.toLowerCase().startsWith("text/event-stream")) {
    await response.body?.cancel();
    return privateJSON({ error: { message: "Backend stream unavailable" } }, 502);
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": contentType || "application/json",
      "Cache-Control": "private, no-store, no-cache",
      Pragma: "no-cache",
      "X-Accel-Buffering": "no",
      ...(response.headers.get("x-request-id")
        ? { "X-Request-ID": response.headers.get("x-request-id")! }
        : {}),
    },
  });
}

function readTrustedClientIP(request: Request, headerName?: string): string | undefined {
  const normalizedName = headerName?.trim().toLowerCase();
  if (!normalizedName || !/^[a-z0-9-]+$/.test(normalizedName)) return undefined;
  const value = request.headers.get(normalizedName)?.trim();
  return value && isIP(value) !== 0 ? value : undefined;
}

function privateJSON(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: PRIVATE_RESPONSE_HEADERS });
}
