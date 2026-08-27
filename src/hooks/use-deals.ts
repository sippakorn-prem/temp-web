"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDeal, getDealPolicy, getInvitation, listDeals } from "@/lib/api/deals";

// Query keys are conventional arrays: ['deals'] for the list, ['deal', code] for one.

export function useDeals() {
  return useQuery({
    queryKey: ["deals"],
    queryFn: listDeals,
  });
}

export function useDeal(code: string) {
	const query = useQuery({
		queryKey: ["deal", code],
		queryFn: async () => getDeal(code),
		enabled: Boolean(code),
	});
	useDealEvents(code, query.isSuccess);
	return query;
}

/**
 * The invitation preview for a code the viewer has not joined yet. Kept separate from
 * {@link useDeal}: the deal endpoint is participant-only, so the deal room falls back to
 * this when that lookup is refused (403/404) to render the review-and-accept surface.
 */
export function useInvitation(code: string, enabled: boolean) {
	return useQuery({
		queryKey: ["invitation", code],
		queryFn: () => getInvitation(code),
		enabled: Boolean(code) && enabled,
	});
}

export function useDealPolicy(enabled = true) {
	return useQuery({
		queryKey: ["deal-policy"],
		queryFn: getDealPolicy,
		enabled,
	});
}

export function useDealEvents(code: string, enabled = true) {
	const queryClient = useQueryClient();

	React.useEffect(() => {
		if (!code || !enabled) return;
		const invalidate = () => {
			void queryClient.invalidateQueries({ queryKey: ["deal", code] });
			void queryClient.invalidateQueries({ queryKey: ["deals"] });
		};
		const source = new EventSource(`/api/deals/${encodeURIComponent(code)}/events`);
		// `open` fires on every (re)connect and already covers the connect refetch; the backend's
		// `deal.sync` "connected" event lands at the same instant, so listening to it too would
		// double every reconnect. Only the data-carrying events invalidate beyond that.
		const eventTypes = ["deal.updated", "transfer.updated"];
		source.addEventListener("open", invalidate);
		for (const type of eventTypes) source.addEventListener(type, invalidate);
		const onVisibility = () => {
			if (document.visibilityState === "visible") invalidate();
		};
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			source.removeEventListener("open", invalidate);
			for (const type of eventTypes) source.removeEventListener(type, invalidate);
			document.removeEventListener("visibilitychange", onVisibility);
			source.close();
		};
	}, [code, enabled, queryClient]);
}
