import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addDisputeEvidence,
  cancelDispute,
  getDealDispute,
  getDispute,
  listOpenDisputes,
  markDisputeRefundPaid,
  openDispute,
  resolveDisputeForBuyer,
  resolveDisputeForSeller,
  reviewDispute,
  type EvidenceMedia,
} from "@/lib/api/disputes";
import type { DisputeReason } from "@/lib/domain/dispute";

export function useDealDispute(code: string, enabled: boolean) {
  return useQuery({ queryKey: ["dispute", code], queryFn: () => getDealDispute(code), enabled });
}

export function useOpenDispute(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: DisputeReason; description: string }) => openDispute(code, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["deal", code] });
      void qc.invalidateQueries({ queryKey: ["dispute", code] });
    },
  });
}

export function useAddDisputeEvidence(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note, media }: { id: string; note?: string; media?: EvidenceMedia }) =>
      addDisputeEvidence(id, { note, media }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["dispute", code] }),
  });
}

export function useCancelDispute(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelDispute(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["deal", code] });
      void qc.invalidateQueries({ queryKey: ["dispute", code] });
    },
  });
}

// --- admin ---

export function useOpenDisputes() {
  return useQuery({ queryKey: ["admin", "disputes"], queryFn: listOpenDisputes });
}

/** The admin detail view of one dispute. */
export function useAdminDispute(id: string) {
  return useQuery({ queryKey: ["admin", "dispute", id], queryFn: () => getDispute(id), enabled: !!id });
}

/**
 * Admin resolution actions. Invalidates both the queue and the open detail so a resolve/review
 * reflects immediately in place, then the detail refetch shows the resolved outcome.
 */
export function useResolveDispute(id?: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "disputes"] });
    if (id) void qc.invalidateQueries({ queryKey: ["admin", "dispute", id] });
  };
  return {
    review: useMutation({ mutationFn: (disputeId: string) => reviewDispute(disputeId), onSuccess: invalidate }),
    forBuyer: useMutation({
      mutationFn: ({ id: disputeId, note }: { id: string; note: string }) => resolveDisputeForBuyer(disputeId, note),
      onSuccess: invalidate,
    }),
    forSeller: useMutation({
      mutationFn: ({ id: disputeId, note }: { id: string; note: string }) => resolveDisputeForSeller(disputeId, note),
      onSuccess: invalidate,
    }),
    markRefundPaid: useMutation({
      mutationFn: (disputeId: string) => markDisputeRefundPaid(disputeId),
      onSuccess: invalidate,
    }),
  };
}

/** Admin appends evidence to a dispute's record. */
export function useAddAdminEvidence(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ note, media }: { note?: string; media?: EvidenceMedia }) => addDisputeEvidence(id, { note, media }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "dispute", id] }),
  });
}
