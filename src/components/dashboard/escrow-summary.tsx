"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/ds-utils";
import { Icon } from "@/components/icon";
import { formatBaht } from "@/lib/money";
import { code, money, note } from "@/lib/ui";

/**
 * The strip above the deal list: how much of the user's money SafeDeal is currently sitting
 * on, split by which side they're on, and how many deals are blocked on them.
 *
 * It leads with reassurance rather than a number. Someone who has just wired ฿48,000 to a
 * stranger's escrow wants to be told the money is being looked after before being shown a
 * balance — the figures are the evidence, not the headline. That's why the first panel is
 * copy on an info-tinted ground and the amounts follow it.
 */
export function EscrowSummary({
  buyerHeldSatang,
  sellerHeldSatang,
  actionCount,
}: {
  buyerHeldSatang: number;
  sellerHeldSatang: number;
  actionCount: number;
}) {
  const t = useTranslations("dashboard.escrow");

  return (
    <section
      aria-label={t("label")}
      className="flex flex-wrap overflow-hidden rounded-xl border border-info-border bg-card shadow-sm"
    >
      <div className="flex flex-[2_1_280px] items-center gap-3.5 bg-info-bg p-5">
        <span className="grid size-10.5 shrink-0 place-items-center rounded-lg bg-card text-info">
          <Icon name="protection" className="size-5.5" />
        </span>
        <div className="min-w-0">
          <strong className="block text-[14.5px]">{t("title")}</strong>
          <span className={cn(note, "text-xs")}>{t("body")}</span>
        </div>
      </div>

      <Figure label={t("heldAsBuyer")} value={formatBaht(buyerHeldSatang)} />
      <Figure label={t("heldAsSeller")} value={formatBaht(sellerHeldSatang)} />
      <Figure label={t("needsAction")} value={String(actionCount)} tone="warning" />
    </section>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning";
}) {
  return (
    <div
      className={cn(
        "flex-[1_1_160px] border-l border-border px-5 py-4.5",
        // The action column is tinted so the eye lands on it last and stays there — it's the
        // only one of the three that asks for anything.
        tone === "warning" &&
          "bg-[color-mix(in_srgb,var(--color-warning-bg)_40%,var(--color-card))]"
      )}
    >
      <span className={cn(code, "text-[11px]", tone === "warning" && "text-warning")}>
        {label}
      </span>
      <div className={cn(money, "mt-1.5 text-2xl", tone === "warning" && "text-warning")}>
        {value}
      </div>
    </div>
  );
}
