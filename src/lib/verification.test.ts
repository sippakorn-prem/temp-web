import { describe, expect, it } from "vitest";
import { codeFailureKind, safeReturnTo } from "@/lib/verification";

/** The shape Clerk throws: an HTTP status plus an `errors` array of coded failures. */
function clerkError(status: number, code: string) {
  return { status, errors: [{ code, message: code, longMessage: code }] };
}

describe("why a code was rejected", () => {
  it("reads a 429 as rate limiting whatever the code says", () => {
    expect(codeFailureKind(clerkError(429, "form_code_incorrect"))).toBe("ratelimited");
  });

  it("separates expired from incorrect — one needs a new code, the other a careful retype", () => {
    expect(codeFailureKind(clerkError(422, "verification_expired"))).toBe("expired");
    expect(codeFailureKind(clerkError(422, "form_code_incorrect"))).toBe("incorrect");
  });

  it("falls back to unknown for anything that isn't a Clerk API error", () => {
    expect(codeFailureKind(new Error("network down"))).toBe("unknown");
    expect(codeFailureKind(clerkError(500, "internal_error"))).toBe("unknown");
  });
});

describe("where ?next= may send someone", () => {
  it("keeps ordinary same-origin paths", () => {
    expect(safeReturnTo("/deals/new")).toBe("/deals/new");
    expect(safeReturnTo("/deals/SD-4821?tab=terms")).toBe("/deals/SD-4821?tab=terms");
  });

  it("refuses anything that can leave the origin", () => {
    expect(safeReturnTo("//evil.com")).toBe("/dashboard");
    expect(safeReturnTo("https://evil.com")).toBe("/dashboard");
    expect(safeReturnTo("/\\evil.com")).toBe("/dashboard");
    expect(safeReturnTo("javascript:alert(1)")).toBe("/dashboard");
  });

  it("falls back when there's no destination at all", () => {
    expect(safeReturnTo(null)).toBe("/dashboard");
    expect(safeReturnTo("")).toBe("/dashboard");
  });
});
