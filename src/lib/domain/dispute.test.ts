import { describe, expect, it } from "vitest";

import { canCancelDispute, canOpenDispute, disputeActive } from "@/lib/domain/dispute";

describe("dispute open availability", () => {
  it("lets the buyer open once the item is in play", () => {
    expect(canOpenDispute({ role: "buyer", status: "shipped" })).toBe(true);
    expect(canOpenDispute({ role: "buyer", status: "delivered" })).toBe(true);
  });

  it("blocks the seller, and the buyer before/after the item is in play", () => {
    expect(canOpenDispute({ role: "seller", status: "shipped" })).toBe(false);
    expect(canOpenDispute({ role: "buyer", status: "funded" })).toBe(false);
    expect(canOpenDispute({ role: "buyer", status: "in_dispute" })).toBe(false);
    expect(canOpenDispute({ role: "buyer", status: "completed" })).toBe(false);
  });
});

describe("dispute cancel + active", () => {
  it("only the opener can cancel, and only while open", () => {
    expect(canCancelDispute("open", true)).toBe(true);
    expect(canCancelDispute("open", false)).toBe(false);
    expect(canCancelDispute("under_review", true)).toBe(false);
  });

  it("is active while open or under review", () => {
    expect(disputeActive("open")).toBe(true);
    expect(disputeActive("under_review")).toBe(true);
    expect(disputeActive("resolved_buyer")).toBe(false);
    expect(disputeActive("cancelled")).toBe(false);
  });
});
