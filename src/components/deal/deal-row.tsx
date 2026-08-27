"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ClockIcon } from "lucide-react";
import { Badge } from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { UserAvatar } from "@/components/user-avatar";
import { isUrgent, needsAction, statusTone, type DealSummary } from "@/lib/domain/deal";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatBaht } from "@/lib/money";
import { code as codeStyle, money } from "@/lib/ui";

/**
 * One deal in the dashboard preview or complete deals list.
 *
 * The row answers three questions in three columns: who it's with, what's happening and
 * whose move it is, and how much is at stake. The tint carries the fourth — a row you have
 * to act on is warm, a disputed one is red with a heavy left edge — so a long list can be
 * triaged without reading a word.
 *
 * The tints are mixed against `--color-card` rather than set as an alpha, because rows sit
 * on the page background: a translucent amber would pick up whatever is behind it and drift.
 */
const ACTION_TINT =
  "border-warning-border bg-[color-mix(in_srgb,var(--color-warning-bg)_42%,var(--color-card))]";
const DISPUTE_TINT =
  "border-error-border border-l-4 border-l-error bg-[color-mix(in_srgb,var(--color-error-bg)_42%,var(--color-card))]";

export function DealRow({ deal }: { deal: DealSummary }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const disputed = deal.status === "in_dispute";
  const acts = needsAction(deal);

  return (
    <Link
      href={`/deals/${deal.code}`}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 no-underline transition-[box-shadow,border-color] duration-150 hover:border-primary/30 hover:shadow-md sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4 sm:px-4.5",
        acts && !disputed && ACTION_TINT,
        disputed && DISPUTE_TINT
      )}
    >
      <UserAvatar
        name={deal.counterparty.name}
        initials={deal.counterparty.initials}
        size={44}
      />

      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <strong className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em]">
            {deal.title}
          </strong>
          <Badge
            variant="outline"
            className="shrink-0 bg-card px-[7px] py-[2px] text-[11px] whitespace-nowrap text-muted-foreground"
          >
            {deal.role === "buyer" ? t("asBuyer") : t("asSeller")}
          </Badge>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-[7px] gap-y-0.5 text-xs text-muted-foreground">
          <span className="max-w-full truncate">{deal.counterparty.name}</span>
          <span aria-hidden className="opacity-50">
            ·
          </span>
          <span className={cn(codeStyle, "shrink-0 text-[11px]")}>{deal.code}</span>
          <span aria-hidden className="opacity-50">
            ·
          </span>
          <span className="shrink-0 whitespace-nowrap">
            {formatDate(deal.updatedAtISO, locale) ?? "—"}
          </span>
        </div>

        <div
          className={cn(
            "truncate text-[13px]",
            disputed && "font-semibold text-error",
            acts && !disputed && "font-semibold text-warning",
            !acts && "text-muted-foreground"
          )}
        >
          {deal.hint}
        </div>
      </div>

      <div className="col-span-full flex min-w-0 items-center justify-end gap-2 text-right sm:col-span-1 sm:grid sm:min-w-26 sm:shrink-0 sm:justify-items-end sm:gap-1.5">
        <span className={cn(money, "text-lg")}>{formatBaht(deal.amountSatang)}</span>
        <Badge variant={statusTone(deal.status)} className="whitespace-nowrap">
          {t(`state.${deal.status}`)}
        </Badge>
        {deal.deadline ? <DeadlineChip deadline={deal.deadline} locale={locale} /> : null}
      </div>
    </Link>
  );
}

/** The clock on the row. Amber once it's close enough to matter, grey while it isn't. */
function DeadlineChip({
  deadline,
  locale,
}: {
  deadline: NonNullable<DealSummary["deadline"]>;
  locale: string;
}) {
  const urgent = isUrgent(deadline);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] font-mono text-xs font-semibold",
        urgent ? "bg-warning-bg text-warning" : "bg-muted text-muted-foreground"
      )}
    >
      <ClockIcon aria-hidden className="size-3.5" />
      {formatDateTime(deadline.atISO, locale) ?? "—"}
    </span>
  );
}
