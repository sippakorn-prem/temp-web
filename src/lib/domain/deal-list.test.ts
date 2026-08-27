import { describe, expect, it } from "vitest";
import { EMPTY_QUERY, PAGE_SIZE, selectDeals } from "@/lib/domain/deal-list";
import type { DealStatus, DealSummary } from "@/lib/domain/deal";

function deal(
  code: string,
  overrides: Partial<DealSummary> & { status: DealStatus; role: "buyer" | "seller" }
): DealSummary {
  return {
    code,
    title: `Deal ${code}`,
    amountSatang: 1_000_00,
    counterparty: { name: "Nattapong S.", initials: "NS" },
    updatedAtISO: "2026-08-15T12:00:00Z",
    hint: "",
    ...overrides,
  };
}

// Waiting on the viewer.
const mine = deal("SD-ACT", { status: "delivered", role: "buyer" });
// Waiting on the other side.
const theirs = deal("SD-WAIT", { status: "shipped", role: "buyer" });
const finished = deal("SD-DONE", { status: "completed", role: "seller" });

describe("dashboard deal list", () => {
  it("floats deals waiting on the viewer above the rest, whatever the sort", () => {
    const big = deal("SD-BIG", { status: "shipped", role: "seller", amountSatang: 900_000_00 });
    const view = selectDeals([big, mine], { ...EMPTY_QUERY, sort: "amount" });
    expect(view.action.map((d) => d.code)).toEqual(["SD-ACT"]);
    expect(view.rest.map((d) => d.code)).toEqual(["SD-BIG"]);
  });

  it("leaves 'latest update' in the order the API returned", () => {
    const view = selectDeals([theirs, finished], EMPTY_QUERY);
    expect(view.rest.map((d) => d.code)).toEqual(["SD-WAIT", "SD-DONE"]);
  });

  it("sinks deals with no deadline below every deal that has one", () => {
    const soon = deal("SD-SOON", {
      status: "shipped",
      role: "buyer",
      deadline: { atISO: "2026-08-15T14:00:00Z", minutesLeft: 120 },
    });
    const later = deal("SD-LATER", {
      status: "shipped",
      role: "buyer",
      deadline: { atISO: "2026-08-21T12:00:00Z", minutesLeft: 8_640 },
    });
    const view = selectDeals([theirs, later, soon], { ...EMPTY_QUERY, sort: "deadline" });
    expect(view.rest.map((d) => d.code)).toEqual(["SD-SOON", "SD-LATER", "SD-WAIT"]);
  });

  it("searches title, short code and counterparty together", () => {
    const rows = [mine, theirs];
    expect(selectDeals(rows, { ...EMPTY_QUERY, search: "sd-wait" }).rest).toHaveLength(1);
    expect(selectDeals(rows, { ...EMPTY_QUERY, search: "nattapong" }).total).toBe(2);
    expect(selectDeals(rows, { ...EMPTY_QUERY, search: "kettle" }).total).toBe(0);
  });

  it("separates 'no deals at all' from 'nothing matches' — only the latter is filtered-empty", () => {
    expect(selectDeals([], EMPTY_QUERY).filteredEmpty).toBe(false);
    expect(selectDeals([mine], { ...EMPTY_QUERY, filter: "completed" }).filteredEmpty).toBe(true);
  });

  it("counts matches across all pages, not just the visible one", () => {
    const many = Array.from({ length: PAGE_SIZE + 3 }, (_, i) =>
      deal(`SD-${i}`, { status: "shipped", role: "buyer" })
    );
    const view = selectDeals(many, EMPTY_QUERY);
    expect(view.action.length + view.rest.length).toBe(PAGE_SIZE);
    expect(view.total).toBe(PAGE_SIZE + 3);
    expect(view.pageCount).toBe(2);
  });

  it("clamps an out-of-range page instead of showing an empty list", () => {
    expect(selectDeals([mine], { ...EMPTY_QUERY, page: 9 }).page).toBe(1);
  });
});
