import { apiFetch } from "@/lib/api/client";

export type PayoutStatus = "none" | "pending" | "active" | "rejected";
export interface Payout {
  status: PayoutStatus;
  destination?: string;
  rejectionReason?: string;
  canCreateDeal: boolean;
  canJoinDeal: boolean;
}

export interface PayoutOnboardingInput {
  accountName: string;
  bankBrand: string;
  accountNumber: string;
}

export function getPayout(): Promise<Payout> {
  return apiFetch<Payout>("/api/payout");
}
export function startPayoutOnboarding(input: PayoutOnboardingInput): Promise<Payout> {
  return apiFetch<Payout>("/api/payout/onboarding", { method: "POST", body: input });
}
