"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/ds-utils";
import { isActive, needsAction, type DealSummary } from "@/lib/domain/deal";
import { formatBaht } from "@/lib/money";
import { code, money, note } from "@/lib/ui";

export function DashboardStats({ deals }: { deals: DealSummary[] }) {
  const t = useTranslations("dashboard.stats");
  const active = deals.filter((deal) => isActive(deal.status));
  const escrowTotal = active.reduce((total, deal) => total + deal.amountSatang, 0);
  const actionCount = active.filter(needsAction).length;
  const completedCount = deals.filter((deal) => deal.status === "completed").length;

  return (
    <section aria-label={t("label")} className="grid gap-3 sm:grid-cols-3">
      <StatCard
        tone="held"
        label={t("escrow")}
        value={formatBaht(escrowTotal)}
        detail={t("active", { count: active.length })}
      />
      <StatCard
        tone="action"
        label={t("action")}
        value={String(actionCount)}
        detail={t("actionDetail")}
      />
      <StatCard
        tone="complete"
        label={t("completed")}
        value={String(completedCount)}
        detail={t("completedDetail")}
      />
    </section>
  );
}

function StatCard({
  tone,
  label,
  value,
  detail,
}: {
  tone: "held" | "action" | "complete";
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-5 pl-6 shadow-xs",
        tone === "held" && "border-info-border",
        tone === "action" && "border-warning-border",
        tone === "complete" && "border-success-border"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          tone === "held" && "bg-info",
          tone === "action" && "bg-warning",
          tone === "complete" && "bg-success"
        )}
      />
      <span className={cn(code, tone === "action" && "text-warning")}>{label}</span>
      <div className={cn(money, "mt-2 text-[26px]", tone === "action" && "text-warning")}>{value}</div>
      <p className={cn(note, "mt-2 text-xs")}>{detail}</p>
    </article>
  );
}
