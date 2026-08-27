// The client-side mirror of the deal state machine (DEAL-STATE-MACHINE.md). The backend
// is the only authority — nothing here decides anything, it just decides what to *show*.

/** The single source-of-truth status. No parallel escrow/payment status columns. */
export type DealStatus =
  | "draft"
  | "waiting_buyer_accept"
  | "ready_for_payment"
  | "funded"
  | "shipped"
  | "delivered"
  | "completed"
  | "in_dispute"
  | "refunded"
  | "cancelled"
  | "expired";

/**
 * Payout progress after `completed`. Lives in `payment.transfers` server-side, not in the
 * deal status — "release authorized → transfer processing → seller paid" is derived from it.
 */
export type TransferState = "none" | "pending" | "processing" | "paid" | "failed";

/**
 * Buyer-refund progress, mirroring `TransferState` on the payout side. The deal only becomes
 * `refunded` once this is `successful`; `pending` means the money is on its way back (or, for a
 * PromptPay charge, awaiting a manual bank transfer), and `failed` needs operator attention.
 */
export type RefundState = "none" | "pending" | "successful" | "failed";

export type DealRole = "buyer" | "seller";

const NEW_DEAL_CODE = /^SD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
const LEGACY_DEAL_CODE = /^SD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/;

/** Accept current six-character codes and already-issued ten-character codes. */
export function isDealCode(value: string): boolean {
  const code = value.trim().toUpperCase();
  if (LEGACY_DEAL_CODE.test(code)) return true;
  if (!NEW_DEAL_CODE.test(code)) return false;
  const suffix = code.slice(3);
  return /[23456789]/.test(suffix) && /[ABCDEFGHJKMNPQRSTUVWXYZ]/.test(suffix);
}

/** The eight rungs of the progress rail the deal screen renders. */
export const DEAL_STAGES = [
  "payment",
  "funded",
  "shipping",
  "delivery",
  "inspection",
  "release",
  "transfer",
  "complete",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

/** Statuses that take the deal off the happy path and replace the stage panel entirely. */
export const EDGE_STATUSES = ["in_dispute", "refunded", "cancelled", "expired"] as const;
export type EdgeStatus = (typeof EDGE_STATUSES)[number];

export function isEdgeStatus(status: DealStatus): status is EdgeStatus {
  return (EDGE_STATUSES as readonly string[]).includes(status);
}

/** Deals a user can still act on — everything that isn't a terminal outcome. */
export function isActive(status: DealStatus): boolean {
  return !["completed", "refunded", "cancelled", "expired"].includes(status);
}

/**
 * Is the deal blocked on *this* viewer rather than the other side or a timer?
 *
 * Feeds the sidebar's Deals badge, which is the only place in the chrome that says
 * "something is waiting on you" — so it counts turns, not open deals. A deal in flight
 * (shipped, awaiting a payout transfer) is somebody else's move and must not light it up,
 * or the badge stops meaning anything. A dispute counts for both sides: an admin is
 * waiting on evidence from whoever has it.
 */
export function needsAction(deal: Pick<DealSummary, "status" | "role">): boolean {
  switch (deal.status) {
    case "waiting_buyer_accept":
    case "ready_for_payment":
    case "delivered":
      return deal.role === "buyer";
    case "funded":
      return deal.role === "seller";
    case "in_dispute":
      return true;
    default:
      return false;
  }
}

/**
 * Is SafeDeal actually sitting on this deal's money right now?
 *
 * Distinct from [`fundsAreHeld`], which answers the *deal screen's* question — where the
 * rail sits — and deliberately returns nothing for a deal knocked off the happy path. This
 * one answers the custody question, so a dispute counts: the money is very much still ours
 * to return. It gates account deletion, where getting it wrong strands funds with nobody
 * left to pay them back to.
 */
export function escrowHoldsMoney(status: DealStatus): boolean {
  return ["funded", "shipped", "delivered", "in_dispute"].includes(status);
}

export interface DealParty {
  name: string;
  initials: string;
}

export interface DealShipment {
  carrier: string;
  trackingNumber: string;
  latestUpdate?: string;
}

export interface DealTerms {
  agreement: string;
}

/**
 * The clock a deal is running against — an auto-release, a ship-by, a deadline to answer a
 * dispute. Time is a first-class actor here (CLAUDE.md), so a row says how long is left,
 * not just what state it's in.
 *
 * The raw timestamp is formatted only at the rendering boundary. `minutesLeft` is what the
 * client sorts and styles by, so display formatting never changes urgency ordering.
 */
export interface DealDeadline {
  atISO: string;
  minutesLeft: number;
}

/** Inside two days is close enough that the row should shout rather than mention. */
export const URGENT_WITHIN_MINUTES = 48 * 60;

export function isUrgent(deadline: DealDeadline): boolean {
  return deadline.minutesLeft <= URGENT_WITHIN_MINUTES;
}

export interface DealSummary {
  code: string;
  title: string;
  /** Integer satang — never baht, never a float (CLAUDE.md golden rule 1). */
  amountSatang: number;
  status: DealStatus;
  /** The viewer's side of this deal. */
  role: DealRole;
  counterparty: DealParty;
  updatedAtISO: string;
  /** One-line "what's happening" hint shown under the title in the list. */
  hint: string;
  /** Absent when nothing is counting down against this deal. */
  deadline?: DealDeadline;
}

export interface Deal extends DealSummary {
	description?: string;
	revision?: number;
  transfer: TransferState;
  refund: RefundState;
	shipBy?: string;
	inviteExpiresAt?: string;
	acceptExpiresAt?: string;
	autoCompleteAt?: string;
  shipment?: DealShipment;
  terms: DealTerms;
	preferredCarrier?: string;
	inspectionPeriodDays?: number;
	shippingDestination?: { receiverName: string; phone: string; address: string };
	events?: Array<{ type: string; actorType: string; createdAt: string }>;
	mediaUrls?: string[];
  payoutDestination?: string;
}

export interface DealPage {
	items: Deal[];
	nextCursor?: string;
	summary: { heldSatang: number; needsActionCount: number; completedCount: number };
}

/**
 * Which rung of the rail a deal sits on. Returns null for edge statuses — those replace
 * the stage panel rather than occupying a rung.
 *
 * `shipping` is deliberately absent: it is a seller-local step (the shipment form is open),
 * not a server state, so the deal screen opts into it rather than deriving it.
 */
export function dealStage(deal: Pick<Deal, "status" | "transfer">): DealStage | null {
  switch (deal.status) {
    case "ready_for_payment":
      return "payment";
    case "funded":
      return "funded";
    case "shipped":
      return "delivery";
    case "delivered":
      return "inspection";
    case "completed":
      if (deal.transfer === "paid") return "complete";
      if (deal.transfer === "processing") return "transfer";
      return "release";
    default:
      // draft / waiting_buyer_accept precede the escrow rail; edge statuses replace it.
      return null;
  }
}

/** Badge tone for a stage, matching the design: amber to act, blue in flight, green done. */
export function stageTone(stage: DealStage): "warning" | "info" | "success" {
  if (stage === "complete") return "success";
  if (stage === "payment") return "warning";
  return "info";
}

/** Badge tone for a list row's status chip. */
export function statusTone(
  status: DealStatus
): "warning" | "info" | "success" | "error" | "terminal" {
  switch (status) {
    case "ready_for_payment":
    case "delivered":
      return "warning";
    case "funded":
    case "shipped":
      return "info";
    case "completed":
      return "success";
    case "in_dispute":
      return "error";
    default:
      return "terminal";
  }
}

/** Money is held from the moment it lands until the transfer clears. */
export function fundsAreHeld(deal: Pick<Deal, "status" | "transfer">): boolean {
  const stage = dealStage(deal);
  if (!stage) return false;
  return stage !== "payment" && stage !== "complete";
}

/**
 * Whether the seller can still refund the buyer — the escrow is held and has not begun moving
 * to the seller. Mirrors the backend's allowed refund transitions (funded/shipped/delivered,
 * no transfer yet). The backend is the authority; this only gates showing the control.
 */
export function canRefund(deal: Pick<Deal, "status" | "transfer" | "refund">): boolean {
  return (
    ["funded", "shipped", "delivered"].includes(deal.status) &&
    deal.transfer === "none" &&
    deal.refund === "none"
  );
}

/**
 * A refund has been requested but the money has not settled yet — the deal is frozen while it is
 * returned to the buyer. `pending` covers both an in-flight card refund and a PromptPay refund
 * awaiting a manual bank transfer; `failed` needs operator action.
 */
export function refundInFlight(deal: Pick<Deal, "status" | "refund">): boolean {
  return deal.status !== "refunded" && (deal.refund === "pending" || deal.refund === "failed");
}
