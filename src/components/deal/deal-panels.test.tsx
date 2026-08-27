import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/en.json";
import { DealEdgePanel, DealPanel, type DealActions } from "@/components/deal/deal-panels";
import { DEAL_STAGES, EDGE_STATUSES, type Deal, type DealRole } from "@/lib/domain/deal";

const ACTIONS: DealActions = {
  onPay: vi.fn(),
  onPrepareShipment: vi.fn(),
  onConfirmShipment: vi.fn(),
  onConfirmReceipt: vi.fn(),
  onAccept: vi.fn(),
  onReportProblem: vi.fn(),
  onRenew: vi.fn(),
};

const DEAL: Deal = { code: "SD-23456789AB", title: "Camera", description: "", revision: 1, amountSatang: 1_850_000, status: "delivered", transfer: "none", refund: "none", role: "buyer", counterparty: { name: "Seller", initials: "S" }, updatedAtISO: "2026-08-15T12:00:00Z", hint: "Inspect the item", shipBy: "2026-08-18T12:00:00Z", autoCompleteAt: "2026-08-21T12:00:00Z", terms: { agreement: "No warranty" } };
const ROLES: DealRole[] = ["buyer", "seller"];

function renderPanel(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("deal panels", () => {
  // Every rung of the rail must say something to both sides — a blank panel means a party
  // is staring at a screen that doesn't tell them whether the money is safe.
  it.each(DEAL_STAGES.flatMap((stage) => ROLES.map((role) => [stage, role] as const)))(
    "renders a panel for %s / %s",
    (stage, role) => {
      const { container } = renderPanel(
        <DealPanel stage={stage} deal={{ ...DEAL, role }} role={role} feeBPS={300} actions={ACTIONS} />
      );
      expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      // No unresolved ICU placeholders leaking into the UI.
      expect(container.textContent).not.toMatch(/\{[a-zA-Z]+\}/);
    }
  );

  it.each(EDGE_STATUSES)("renders the %s edge panel", (status) => {
    const { container } = renderPanel(<DealEdgePanel status={status} onRenew={vi.fn()} />);
    expect(container.textContent).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("only offers renewal on an expired deal", () => {
    const expired = renderPanel(<DealEdgePanel status="expired" onRenew={vi.fn()} />);
    expect(within(expired.container).getByRole("button")).toHaveTextContent("Renew deal");

    const disputed = renderPanel(<DealEdgePanel status="in_dispute" onRenew={vi.fn()} />);
    expect(within(disputed.container).queryByRole("button")).toBeNull();
  });

  it("shows the buyer a total equal to the item price — the seller pays the fee", () => {
    renderPanel(
      <DealPanel
        stage="payment"
        deal={{ ...DEAL, role: "buyer" }}
        role="buyer"
        feeBPS={300}
        actions={ACTIONS}
      />
    );
    // Item price and "total charged today" are the same number; the buyer fee is zero.
    expect(screen.getAllByText("฿18,500")).toHaveLength(2);
    expect(screen.getByText("฿0")).toBeInTheDocument();
    expect(screen.getByText("Pay ฿18,500 securely")).toBeInTheDocument();
  });
});
