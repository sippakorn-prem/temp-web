"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPayout, startPayoutOnboarding } from "@/lib/api/payout";

export function usePayout() {
  return useQuery({
    queryKey: ["payout"],
    queryFn: getPayout,
  });
}

export function useStartPayoutOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startPayoutOnboarding,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["payout"] });
    },
  });
}
