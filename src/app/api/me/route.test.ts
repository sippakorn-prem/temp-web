import { beforeEach, describe, expect, it, vi } from "vitest";

const clerk = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken: clerk.getToken }) }));

import { GET } from "./route";

beforeEach(() => {
  clerk.getToken.mockReset();
  vi.unstubAllGlobals();
});

describe("GET /api/me", () => {
  it("returns 401 when there is no Clerk session", async () => {
    clerk.getToken.mockResolvedValue(null);
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(new Request("http://localhost:3005/api/me"));

    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns only the backend-authenticated Clerk user id", async () => {
    clerk.getToken.mockResolvedValue("session-token");
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ data: { clerkUserId: "user_1" } })
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(new Request("http://localhost:3005/api/me"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { clerkUserId: "user_1" } });
    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:8090/v1/me",
      expect.objectContaining({ headers: { Authorization: "Bearer session-token" } })
    );
  });
});
