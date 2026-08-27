import { apiFetch } from "@/lib/api/client";
import type { Deal, DealPage, DealSummary } from "@/lib/domain/deal";

export type MediaInput = { key: string; contentType: string; size: number };
export type CreateDealInput = {
  title: string;
  description: string;
  agreement: string;
  amountSatang: number;
  preferredCarrier: string;
  media: MediaInput[];
};

export type JoinDealInput = {
  accepted: true;
  expectedRevision: number;
  destination: { receiverName: string; phone: string; address: string };
};

export type ShipmentInput = {
  carrier: string;
  trackingNumber: string;
  proofs: MediaInput[];
};
export type DealPolicy = { currency: "THB"; sellerFeeBPS: number; inspectionPeriodDays: number; maxProductFiles: number; maxShipmentProofs: number; maxFileBytes: number };

export function getDealPolicy(): Promise<DealPolicy> { return apiFetch<DealPolicy>("/api/deal-policy"); }

export async function listDeals(): Promise<DealSummary[]> {
  const page = await apiFetch<WirePage>("/api/deals");
  return page.items.map(normalizeDeal);
}
export function getDeal(code: string): Promise<Deal> {
  return apiFetch<WireDeal>(`/api/deals/${encodeURIComponent(code)}`).then(normalizeDeal);
}
export function getInvitation(code: string): Promise<Deal> {
  return apiFetch<WireDeal>(`/api/deal-invitations/${encodeURIComponent(code)}`).then(normalizeDeal);
}
export function createDeal(input: CreateDealInput): Promise<Deal> {
  return apiFetch<WireDeal>("/api/deals", { method: "POST", body: input }).then(normalizeDeal);
}
export function joinDeal(code: string, input: JoinDealInput): Promise<Deal> {
  return apiFetch<WireDeal>(`/api/deal-invitations/${encodeURIComponent(code)}/accept`, { method: "POST", body: input }).then(normalizeDeal);
}
export type PaymentMethod = "promptpay" | "card";
export type ChargeState = "pending" | "successful" | "failed" | "expired";
export type PaymentInstruction = {
  chargeId: string;
  method: PaymentMethod;
  state: ChargeState;
  authorizeUri?: string;
  qrImageUri?: string;
  expiresAt?: string;
};
export type FundResult = { deal: Deal; payment?: PaymentInstruction };
export type FundInput = { method: PaymentMethod; token?: string };

export function fundDeal(code: string, input: FundInput): Promise<FundResult> {
  return apiFetch<{ deal: WireDeal; payment?: PaymentInstruction }>(
    `/api/deals/${encodeURIComponent(code)}/fund`,
    { method: "POST", body: input }
  ).then((r) => ({ deal: normalizeDeal(r.deal), payment: r.payment }));
}
export function shipDeal(code: string, input: ShipmentInput): Promise<Deal> {
  return apiFetch<WireDeal>(`/api/deals/${encodeURIComponent(code)}/shipment`, { method: "POST", body: input }).then(normalizeDeal);
}
export function confirmReceipt(code: string): Promise<Deal> {
  return apiFetch<WireDeal>(`/api/deals/${encodeURIComponent(code)}/receipt`, { method: "POST", body: {} }).then(normalizeDeal);
}
export function acceptItem(code: string): Promise<Deal> {
  return apiFetch<WireDeal>(`/api/deals/${encodeURIComponent(code)}/accept-item`, { method: "POST", body: {} }).then(normalizeDeal);
}
export function refundDeal(code: string): Promise<Deal> {
  return apiFetch<WireDeal>(`/api/deals/${encodeURIComponent(code)}/refund`, { method: "POST", body: {} }).then(normalizeDeal);
}

type WireDeal = Omit<
  Deal,
  "terms" | "hint" | "updatedAtISO" | "deadline" | "preferredCarrier" | "inspectionPeriodDays"
> & {
  updatedAt: string;
  terms: { agreement: string; preferredCarrier: string; inspectionPeriodDays: number };
  shipBy?: string;
};
type WirePage = Omit<DealPage, "items"> & { items: WireDeal[] };

function normalizeDeal(wire: WireDeal): Deal {
  const deadlineISO = wire.status === "waiting_buyer_accept" ? wire.inviteExpiresAt : wire.status === "ready_for_payment" ? wire.acceptExpiresAt : wire.status === "funded" ? wire.shipBy : wire.status === "delivered" ? wire.autoCompleteAt : undefined;
  const minutesLeft = deadlineISO ? Math.max(0, Math.floor((Date.parse(deadlineISO) - Date.now()) / 60000)) : undefined;
  const { updatedAt, terms, ...deal } = wire;
  return {
    ...deal,
    updatedAtISO: updatedAt,
    hint: wire.status.replaceAll("_", " "),
    deadline: deadlineISO && minutesLeft !== undefined ? { atISO: deadlineISO, minutesLeft } : undefined,
    preferredCarrier: terms.preferredCarrier,
    inspectionPeriodDays: terms.inspectionPeriodDays,
    terms: { agreement: terms.agreement },
  };
}
