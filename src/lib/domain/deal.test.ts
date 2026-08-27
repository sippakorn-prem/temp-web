import { describe, expect, it } from "vitest";

import {
  canRefund,
  dealStage,
  escrowHoldsMoney,
  fundsAreHeld,
  isActive,
  isDealCode,
  isEdgeStatus,
  needsAction,
  refundInFlight,
} from "@/lib/domain/deal";

describe("deal code validation", () => {
  it("accepts six unambiguous uppercase characters containing letters and numbers", () => {
    expect(isDealCode("SD-7K3P9X")).toBe(true);
    expect(isDealCode("sd-7k3p9x")).toBe(true);
  });

  it("keeps already-issued ten-character codes readable", () => {
    expect(isDealCode("SD-65QDXBSPMQ")).toBe(true);
  });

  it("rejects single-class, ambiguous, and malformed new codes", () => {
    expect(isDealCode("SD-234567")).toBe(false);
    expect(isDealCode("SD-ABCDEF")).toBe(false);
    expect(isDealCode("SD-A0C1EF")).toBe(false);
    expect(isDealCode("SD-7K3P9")).toBe(false);
  });
});

describe("deal stage derivation", () => {
  it("splits `completed` by transfer state — the deal status alone isn't the payout state", () => {
    expect(dealStage({ status: "completed", transfer: "pending" })).toBe("release");
    expect(dealStage({ status: "completed", transfer: "processing" })).toBe("transfer");
    expect(dealStage({ status: "completed", transfer: "paid" })).toBe("complete");
  });

  it("puts pre-escrow and edge statuses off the rail", () => {
    for (const status of ["draft", "waiting_buyer_accept", "in_dispute", "refunded"] as const) {
      expect(dealStage({ status, transfer: "none" })).toBeNull();
    }
  });

  it("shows the held-funds bar from payment landing until the transfer clears", () => {
    expect(fundsAreHeld({ status: "ready_for_payment", transfer: "none" })).toBe(false);
    expect(fundsAreHeld({ status: "funded", transfer: "none" })).toBe(true);
    expect(fundsAreHeld({ status: "shipped", transfer: "none" })).toBe(true);
    expect(fundsAreHeld({ status: "completed", transfer: "processing" })).toBe(true);
    expect(fundsAreHeld({ status: "completed", transfer: "paid" })).toBe(false);
  });

  it("treats only the four off-path statuses as edges", () => {
    expect(isEdgeStatus("in_dispute")).toBe(true);
    expect(isEdgeStatus("expired")).toBe(true);
    expect(isEdgeStatus("funded")).toBe(false);
  });

  it("counts anything without a terminal outcome as active", () => {
    expect(isActive("in_dispute")).toBe(true);
    expect(isActive("completed")).toBe(false);
    expect(isActive("expired")).toBe(false);
  });
});

describe("who is holding the money", () => {
  it("counts a disputed deal, which the rail's own held-funds check deliberately doesn't", () => {
    expect(escrowHoldsMoney("in_dispute")).toBe(true);
    expect(fundsAreHeld({ status: "in_dispute", transfer: "none" })).toBe(false);
  });

  it("excludes deals whose money never arrived or has already left", () => {
    expect(escrowHoldsMoney("ready_for_payment")).toBe(false);
    expect(escrowHoldsMoney("waiting_buyer_accept")).toBe(false);
    expect(escrowHoldsMoney("completed")).toBe(false);
    expect(escrowHoldsMoney("refunded")).toBe(false);
  });

  it("covers everything between payment landing and release", () => {
    expect(escrowHoldsMoney("funded")).toBe(true);
    expect(escrowHoldsMoney("shipped")).toBe(true);
    expect(escrowHoldsMoney("delivered")).toBe(true);
  });
});

describe("seller refund availability", () => {
  it("allows a refund while escrow is held and neither a payout nor a refund has started", () => {
    expect(canRefund({ status: "funded", transfer: "none", refund: "none" })).toBe(true);
    expect(canRefund({ status: "shipped", transfer: "none", refund: "none" })).toBe(true);
    expect(canRefund({ status: "delivered", transfer: "none", refund: "none" })).toBe(true);
  });

  it("blocks a refund once money is moving, has left escrow, or a refund is already under way", () => {
    expect(canRefund({ status: "delivered", transfer: "pending", refund: "none" })).toBe(false);
    expect(canRefund({ status: "completed", transfer: "paid", refund: "none" })).toBe(false);
    expect(canRefund({ status: "ready_for_payment", transfer: "none", refund: "none" })).toBe(false);
    expect(canRefund({ status: "refunded", transfer: "none", refund: "successful" })).toBe(false);
    expect(canRefund({ status: "funded", transfer: "none", refund: "pending" })).toBe(false);
  });
});

describe("refund in flight", () => {
  it("is true while a requested refund has not settled", () => {
    expect(refundInFlight({ status: "funded", refund: "pending" })).toBe(true);
    expect(refundInFlight({ status: "shipped", refund: "failed" })).toBe(true);
  });

  it("is false once settled or never requested", () => {
    expect(refundInFlight({ status: "refunded", refund: "successful" })).toBe(false);
    expect(refundInFlight({ status: "funded", refund: "none" })).toBe(false);
  });
});

describe("whose turn it is", () => {
  it("splits the same status by side — a funded deal waits on the seller, not the buyer", () => {
    expect(needsAction({ status: "funded", role: "seller" })).toBe(true);
    expect(needsAction({ status: "funded", role: "buyer" })).toBe(false);
    expect(needsAction({ status: "delivered", role: "buyer" })).toBe(true);
    expect(needsAction({ status: "delivered", role: "seller" })).toBe(false);
  });

  it("leaves in-flight and finished deals off the badge", () => {
    expect(needsAction({ status: "shipped", role: "buyer" })).toBe(false);
    expect(needsAction({ status: "shipped", role: "seller" })).toBe(false);
    expect(needsAction({ status: "completed", role: "seller" })).toBe(false);
    expect(needsAction({ status: "expired", role: "buyer" })).toBe(false);
  });

  it("puts a dispute on both sides — an admin is waiting on whoever holds the evidence", () => {
    expect(needsAction({ status: "in_dispute", role: "buyer" })).toBe(true);
    expect(needsAction({ status: "in_dispute", role: "seller" })).toBe(true);
  });
});
