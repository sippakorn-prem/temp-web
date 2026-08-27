import { afterEach, describe, expect, it, vi } from "vitest";
import { buildConsentRecord, recordConsent } from "./consent";

const record = buildConsentRecord(
  { termsOfService: true, privacyNotice: true, marketingEmails: false },
  new Date("2026-08-09T09:47:40.019Z")
);

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("recordConsent", () => {
  it("sends the three independent choices and policy version", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);

    await recordConsent(record);

    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      policyVersion: "2026-08-01",
      acceptedAt: "2026-08-09T09:47:40.019Z",
      terms: true,
      privacy: true,
      marketing: false,
    });
  });

  it("retries only projection races with bounded exponential delays", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);

    const pending = recordConsent(record);
    await vi.runAllTimersAsync();
    await pending;

    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("surfaces terminal HTTP and network failures without silent retries", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(recordConsent(record)).rejects.toThrow("Consent request failed (500)");
    expect(fetcher).toHaveBeenCalledOnce();

    fetcher.mockReset().mockRejectedValue(new Error("offline"));
    await expect(recordConsent(record)).rejects.toThrow("offline");
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
