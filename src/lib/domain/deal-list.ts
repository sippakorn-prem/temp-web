import { isActive, needsAction, type DealSummary } from "@/lib/domain/deal";

// Everything the dashboard does to a list of deals before rendering it, as one pure
// function. Kept out of the component so the ordering rules — which are the interesting
// part — can be tested without mounting a page.

export const DEAL_FILTERS = ["all", "buyer", "seller", "active", "completed"] as const;
export type DealFilter = (typeof DEAL_FILTERS)[number];

export const DEAL_SORTS = ["updated", "amount", "deadline"] as const;
export type DealSort = (typeof DEAL_SORTS)[number];

/** How many rows fit before the list stops being scannable and starts being a database. */
export const PAGE_SIZE = 8;

export interface DealQuery {
  filter: DealFilter;
  /** Free text matched against title, short code and counterparty name. */
  search: string;
  sort: DealSort;
  /** 1-based. */
  page: number;
}

export const EMPTY_QUERY: DealQuery = { filter: "all", search: "", sort: "updated", page: 1 };

export interface DealListView {
  /** Rows blocked on the viewer, on the current page. Always shown first. */
  action: DealSummary[];
  /** Everything else on the current page. */
  rest: DealSummary[];
  /** Matches across all pages — what the summary line counts. */
  total: number;
  page: number;
  pageCount: number;
  /** True when the account has deals but none survive the current filter + search. */
  filteredEmpty: boolean;
}

function matchesFilter(deal: DealSummary, filter: DealFilter) {
  switch (filter) {
    case "buyer":
      return deal.role === "buyer";
    case "seller":
      return deal.role === "seller";
    case "active":
      return isActive(deal.status);
    case "completed":
      return deal.status === "completed";
    default:
      return true;
  }
}

function matchesSearch(deal: DealSummary, needle: string) {
  if (!needle) return true;
  const hay = `${deal.title} ${deal.code} ${deal.counterparty.name}`.toLowerCase();
  return hay.includes(needle);
}

export function selectDeals(deals: DealSummary[], query: DealQuery): DealListView {
  const needle = query.search.trim().toLowerCase();
  const matched = deals.filter(
    (deal) => matchesFilter(deal, query.filter) && matchesSearch(deal, needle)
  );

  // Anything waiting on the viewer outranks every sort. A deal you have to act on is not
  // "a big deal" or "a recent deal" — it's the only kind that costs you money to ignore,
  // so no choice in the sort dropdown is allowed to bury it.
  const sorted = [...matched].sort((a, b) => {
    const rank = Number(needsAction(a)) - Number(needsAction(b));
    if (rank !== 0) return -rank;
    switch (query.sort) {
      case "amount":
        return b.amountSatang - a.amountSatang;
      case "deadline":
        // Deals with no clock sink below every deal that has one.
        return (a.deadline?.minutesLeft ?? Infinity) - (b.deadline?.minutesLeft ?? Infinity);
      default:
        // "Latest update" preserves the authoritative order returned by the API.
        return 0;
    }
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page), pageCount);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    action: rows.filter(needsAction),
    rest: rows.filter((deal) => !needsAction(deal)),
    total: sorted.length,
    page,
    pageCount,
    filteredEmpty: deals.length > 0 && sorted.length === 0,
  };
}
