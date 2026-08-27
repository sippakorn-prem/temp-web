import { describe, expect, it, vi } from "vitest";
import { proxyAuthenticated, proxyAuthenticatedStream } from "./server-proxy";

describe("proxyAuthenticated", () => {
  it("rejects a missing Clerk token without contacting the backend", async () => {
    const fetcher = vi.fn();
    const response = await proxyAuthenticated({
      path: "/v1/me",
      token: null,
      request: new Request("http://localhost:3005/api/me"),
      fetcher,
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("forwards the bearer token and only edge-controlled consent evidence headers", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ data: { recorded: true } }, { status: 201 })
    );
    const request = new Request("http://localhost:3005/api/consents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SafeDeal test browser",
        "X-Forwarded-For": "198.51.100.20",
        "X-Real-IP": "203.0.113.7",
      },
      body: JSON.stringify({ terms: true }),
    });

    const response = await proxyAuthenticated({
      path: "/v1/consents",
      token: "session-token",
      request,
      fetcher,
      trustedClientIPHeader: "x-real-ip",
    });

    expect(response.status).toBe(201);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("http://localhost:8090/v1/consents");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer session-token",
      "User-Agent": "SafeDeal test browser",
      "X-Forwarded-For": "203.0.113.7",
    });
    expect(options.body).toBe('{"terms":true}');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("does not forward public IP headers by default or malformed trusted values", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: {} }));
    const request = new Request("http://localhost:3005/api/me", {
      headers: { "X-Forwarded-For": "203.0.113.7", "X-Real-IP": "203.0.113.7, 198.51.100.2" },
    });

    await proxyAuthenticated({ path: "/v1/me", token: "session-token", request, fetcher });
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty("X-Forwarded-For");

    await proxyAuthenticated({
      path: "/v1/me",
      token: "session-token",
      request,
      fetcher,
      trustedClientIPHeader: "x-real-ip",
    });
    expect(fetcher.mock.calls[1][1].headers).not.toHaveProperty("X-Forwarded-For");

    await expect(
      proxyAuthenticated({
        path: "/v1/me",
        token: "session-token",
        request,
        fetcher,
        trustedClientIPHeader: "invalid header name",
      })
    ).resolves.toBeInstanceOf(Response);
  });

  it("rejects non-JSON and oversized request bodies", async () => {
    const fetcher = vi.fn();
    const unsupported = await proxyAuthenticated({
      path: "/v1/consents",
      token: "session-token",
      request: new Request("http://localhost:3005/api/consents", { method: "POST", body: "terms=true" }),
      fetcher,
    });
    expect(unsupported.status).toBe(415);

    const oversized = await proxyAuthenticated({
      path: "/v1/consents",
      token: "session-token",
      request: new Request("http://localhost:3005/api/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "x".repeat(64 * 1024 + 1),
      }),
      fetcher,
    });
    expect(oversized.status).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns a bounded gateway error when the backend is unavailable", async () => {
    const response = await proxyAuthenticated({
      path: "/v1/me",
      token: "session-token",
      request: new Request("http://localhost:3005/api/me"),
      fetcher: vi.fn().mockRejectedValue(new Error("connection refused")),
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: { message: "Backend unavailable" } });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});

describe("proxyAuthenticatedStream", () => {
  it("requires a Clerk token before opening a backend connection", async () => {
    const fetcher = vi.fn();
    const response = await proxyAuthenticatedStream({
      path: "/v1/deals/SD-ABC123/events",
      token: null,
      request: new Request("http://localhost:3005/api/deals/SD-ABC123/events"),
      fetcher,
    });
    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("forwards authentication and preserves the event stream and cancellation signal", async () => {
    const backend = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("event: deal.sync\ndata: {}\n\n"));
      },
    });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(backend, { headers: { "Content-Type": "text/event-stream; charset=utf-8" } })
    );
    const request = new Request("http://localhost:3005/api/deals/SD-ABC123/events");
    const response = await proxyAuthenticatedStream({
      path: "/v1/deals/SD-ABC123/events",
      token: "session-token",
      request,
      fetcher,
    });

    expect(fetcher.mock.calls[0][1]).toMatchObject({
      headers: { Authorization: "Bearer session-token", Accept: "text/event-stream" },
      cache: "no-store",
      signal: request.signal,
    });
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toBe("private, no-store, no-cache");
    expect(await response.body?.getReader().read()).toMatchObject({ done: false });
  });

  it("fails closed when a successful backend response is not an event stream", async () => {
    const response = await proxyAuthenticatedStream({
      path: "/v1/deals/SD-ABC123/events",
      token: "session-token",
      request: new Request("http://localhost:3005/api/deals/SD-ABC123/events"),
      fetcher: vi.fn().mockResolvedValue(Response.json({ data: {} })),
    });
    expect(response.status).toBe(502);
  });
});
