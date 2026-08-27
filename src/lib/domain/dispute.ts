import type { Deal } from "./deal";

/**
 * Buyer-protection escalation. The buyer opens a dispute when the item is not as agreed; the seller
 * defends with evidence; an admin resolves it. Mirrors the backend `dispute` domain — the client only
 * decides what to *show*; the backend is the authority.
 */
export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_buyer"
  | "resolved_seller"
  | "cancelled";

export type DisputeReason =
  | "item_not_received"
  | "not_as_described"
  | "damaged"
  | "counterfeit"
  | "other";

export const DISPUTE_REASONS: DisputeReason[] = [
  "item_not_received",
  "not_as_described",
  "damaged",
  "counterfeit",
  "other",
];

/** Which party submitted a piece of evidence, derived server-side against the deal. */
export type EvidenceSide = "buyer" | "seller" | "admin";

export interface DisputeEvidence {
  id: string;
  uploadedBy: string;
  side?: EvidenceSide;
  note?: string;
  mediaUrl?: string;
  contentType?: string;
  createdAt: string;
}

export interface DisputeParty {
  name?: string;
  initials?: string;
}

export interface Dispute {
  id: string;
  dealCode: string;
  status: DisputeStatus;
  reason: DisputeReason;
  description?: string;
  priorDealStatus: string;
  resolutionNote?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt: string;
  evidence: DisputeEvidence[];

  // Deal context (admin review view).
  amountSatang?: number;
  currency?: string;
  itemTitle?: string;
  paymentMethod?: string; // "card" | "promptpay" | ""
  refundStatus?: string; // "pending" | "successful" | "failed" | ""
  refundManual?: boolean; // that refund awaits an operator bank transfer (PromptPay)
  buyer?: DisputeParty;
  seller?: DisputeParty;
  dealCreatedAt?: string;
  fundedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

/** A buyer win refunded via PromptPay can't be auto-reversed — it becomes a manual operator payout. */
export function isManualRefund(d: Pick<Dispute, "status" | "paymentMethod">): boolean {
  return d.status === "resolved_buyer" && d.paymentMethod === "promptpay";
}

/** A resolved-for-buyer dispute whose manual refund is still awaiting the operator's bank transfer. */
export function refundNeedsPayout(d: Pick<Dispute, "status" | "refundStatus" | "refundManual">): boolean {
  return d.status === "resolved_buyer" && d.refundStatus === "pending" && !!d.refundManual;
}

/** The refund has actually gone back (auto or operator-completed). */
export function refundPaidOut(d: Pick<Dispute, "refundStatus">): boolean {
  return d.refundStatus === "successful";
}

/** SLA pressure from how long an active dispute has waited: green < 3d, amber 3–5d, red ≥ 5d. */
export function disputeSlaLevel(openedAt: string, status: DisputeStatus): "resolved" | "ok" | "warn" | "late" {
  if (!disputeActive(status)) return "resolved";
  const days = (Date.now() - new Date(openedAt).getTime()) / 8.64e7;
  if (days >= 5) return "late";
  if (days >= 3) return "warn";
  return "ok";
}

/** A dispute is still being worked (nobody has resolved or cancelled it). */
export function disputeActive(status: DisputeStatus): boolean {
  return status === "open" || status === "under_review";
}

/** Only the buyer opens a dispute, and only once the item is in play (shipped/delivered). */
export function canOpenDispute(deal: Pick<Deal, "status" | "role">): boolean {
  return deal.role === "buyer" && (deal.status === "shipped" || deal.status === "delivered");
}

/** The buyer who opened it may withdraw it only while it is still open (an admin hasn't touched it). */
export function canCancelDispute(status: DisputeStatus, isOpener: boolean): boolean {
  return isOpener && status === "open";
}
