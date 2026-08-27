import type { Dispute, DisputeReason } from "@/lib/domain/dispute";
import { apiFetch } from "./client";

export interface EvidenceMedia {
  key: string;
  contentType: string;
  size: number;
}

export function openDispute(code: string, input: { reason: DisputeReason; description: string }): Promise<Dispute> {
  return apiFetch<Dispute>(`/api/deals/${encodeURIComponent(code)}/dispute`, { method: "POST", body: input });
}

export function getDealDispute(code: string): Promise<Dispute> {
  return apiFetch<Dispute>(`/api/deals/${encodeURIComponent(code)}/dispute`);
}

export function getDispute(id: string): Promise<Dispute> {
  return apiFetch<Dispute>(`/api/disputes/${encodeURIComponent(id)}`);
}

export function addDisputeEvidence(id: string, input: { note?: string; media?: EvidenceMedia }): Promise<Dispute> {
  return apiFetch<Dispute>(`/api/disputes/${encodeURIComponent(id)}/evidence`, { method: "POST", body: input });
}

export function cancelDispute(id: string): Promise<void> {
  return apiFetch(`/api/disputes/${encodeURIComponent(id)}/cancel`, { method: "POST", body: {} });
}

// --- admin ---

export function listOpenDisputes(): Promise<Dispute[]> {
  return apiFetch<{ disputes: Dispute[] }>(`/api/admin/disputes`).then((r) => r.disputes);
}

export function reviewDispute(id: string): Promise<void> {
  return apiFetch(`/api/admin/disputes/${encodeURIComponent(id)}/review`, { method: "POST", body: {} });
}

export function resolveDisputeForBuyer(id: string, note: string): Promise<void> {
  return apiFetch(`/api/admin/disputes/${encodeURIComponent(id)}/resolve-buyer`, { method: "POST", body: { note } });
}

export function resolveDisputeForSeller(id: string, note: string): Promise<void> {
  return apiFetch(`/api/admin/disputes/${encodeURIComponent(id)}/resolve-seller`, { method: "POST", body: { note } });
}

/** Complete a manual (PromptPay) buyer refund the operator transferred out of band. */
export function markDisputeRefundPaid(id: string): Promise<void> {
  return apiFetch(`/api/admin/disputes/${encodeURIComponent(id)}/mark-refund-paid`, { method: "POST", body: {} });
}
