"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import {
  Badge,
  EmptyState,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ds";
import { Icon } from "@/components/icon";
import { useOpenDisputes } from "@/hooks/use-disputes";
import { ApiError } from "@/lib/api/client";
import { disputeSlaLevel, refundNeedsPayout, type Dispute, type DisputeStatus } from "@/lib/domain/dispute";
import { formatDateTime } from "@/lib/format";
import { formatBaht } from "@/lib/money";
import { cn } from "@/lib/ds-utils";
import { code as codeClass, note } from "@/lib/ui";
import { Avatar, initialsOf, SlaDot, statusVariant } from "./shared";

const PAGE_SIZE = 8;
type Filter = "open" | "under_review" | "needs_payout" | "all";

/** Relative "3d ago" / "5h ago" / "12m ago" for the SLA-forward Opened column. */
function relativeTime(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale === "th" ? "th" : "en", { numeric: "auto" });
  const days = Math.floor(diff / 8.64e7);
  if (days >= 1) return rtf.format(-days, "day");
  const hours = Math.floor(diff / 3.6e6);
  if (hours >= 1) return rtf.format(-hours, "hour");
  return rtf.format(-Math.max(1, Math.floor(diff / 6e4)), "minute");
}

export function DisputeQueue() {
  const t = useTranslations("admin.disputes");
  const tDispute = useTranslations("dispute");
  const locale = useLocale();
  const router = useRouter();
  const query = useOpenDisputes();
  const [filter, setFilter] = React.useState<Filter>("open");
  const [page, setPage] = React.useState(1);

  const all = query.data ?? [];
  const forbidden = query.isError && query.error instanceof ApiError && query.error.status === 403;

  const counts = React.useMemo(
    () => ({
      open: all.filter((d) => d.status === "open").length,
      under_review: all.filter((d) => d.status === "under_review").length,
      needs_payout: all.filter(refundNeedsPayout).length,
      all: all.length,
    }),
    [all]
  );

  const rows = React.useMemo(() => {
    const filtered = all.filter((d) =>
      filter === "all" ? true : filter === "needs_payout" ? refundNeedsPayout(d) : d.status === filter
    );
    return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [all, filter]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const slice = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = rows.length ? (current - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(current * PAGE_SIZE, rows.length);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "open", label: t("filterOpen"), count: counts.open },
    { key: "under_review", label: t("filterUnderReview"), count: counts.under_review },
    { key: "needs_payout", label: t("filterNeedsPayout"), count: counts.needs_payout },
    { key: "all", label: t("filterAll"), count: counts.all },
  ];

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">{t("queueTitle")}</h1>
        <p className={cn(note, "mt-1")}>{t("queueSub")}</p>
      </div>

      {forbidden ? (
        <div className={cn("rounded-xl border border-border bg-card p-0")}>
          <EmptyState tone="error" icon={() => <Icon name="protection" />} title={t("forbiddenTitle")}>
            {t("forbiddenBody")}
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => {
                  setFilter(f.key);
                  setPage(1);
                }}
                className={cn(
                  "inline-flex min-h-8.5 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                  filter === f.key
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] font-bold",
                    filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {query.isPending ? (
            <QueueSkeleton />
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-0">
              <EmptyState tone="filtered" icon={() => <Icon name="protection" />} title={t("emptyTitle")}>
                {t("emptyBody")}
              </EmptyState>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("colDeal")}</TableHead>
                      <TableHead className="text-right">{t("colAmount")}</TableHead>
                      <TableHead>{t("colReason")}</TableHead>
                      <TableHead>{t("colStatus")}</TableHead>
                      <TableHead>{t("colOpened")}</TableHead>
                      <TableHead>{t("colBuyer")}</TableHead>
                      <TableHead>{t("colSeller")}</TableHead>
                      <TableHead className="text-center">{t("colEvidence")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slice.map((d) => (
                      <QueueRow
                        key={d.id}
                        d={d}
                        locale={locale}
                        reason={tDispute(`reasons.${d.reason}`)}
                        statusLabel={statusText(t, d.status)}
                        onOpen={() => router.push(`/admin/disputes/${d.id}`)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pageCount > 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <span className={cn(note, "text-xs")}>
                    {t("pageSummary", { from, to, total: rows.length })}
                  </span>
                  <Pagination label={t("queueTitle")}>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          label={t("back")}
                          ariaLabel={t("back")}
                          aria-disabled={current <= 1}
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            setPage((p) => Math.max(1, p - 1));
                          }}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          label={t("continue")}
                          ariaLabel={t("continue")}
                          aria-disabled={current >= pageCount}
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            setPage((p) => Math.min(pageCount, p + 1));
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function statusText(t: (k: string) => string, status: DisputeStatus): string {
  switch (status) {
    case "open":
      return t("statusOpen");
    case "under_review":
      return t("statusUnderReview");
    case "resolved_seller":
      return t("statusResolvedSeller");
    case "resolved_buyer":
      return t("statusResolvedBuyer");
    default:
      return status;
  }
}

function QueueRow({
  d,
  locale,
  reason,
  statusLabel,
  onOpen,
}: {
  d: Dispute;
  locale: string;
  reason: string;
  statusLabel: string;
  onOpen: () => void;
}) {
  return (
    <TableRow
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer"
    >
      <TableCell>
        <div className="grid gap-0.5">
          <span className={cn(codeClass, "text-[13px] text-foreground")}>{d.dealCode}</span>
          {d.itemTitle ? <span className="text-[11px] text-muted-foreground">{d.itemTitle}</span> : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <span className="font-mono text-[15px] font-bold tabular-nums">
          {formatBaht(d.amountSatang ?? 0, locale)}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant="default">{reason}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant(d.status)}>{statusLabel}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <SlaDot level={disputeSlaLevel(d.createdAt, d.status)} />
          <div className="grid gap-px">
            <span className="text-[13px] font-semibold">{relativeTime(d.createdAt, locale)}</span>
            <span className="text-[11px] text-muted-foreground">{formatDateTime(d.createdAt, locale)}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <PartyCell name={d.buyer?.name} initials={d.buyer?.initials} side="buyer" />
      </TableCell>
      <TableCell>
        <PartyCell name={d.seller?.name} initials={d.seller?.initials} side="seller" />
      </TableCell>
      <TableCell className="text-center">
        <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
          <Icon name="file" className="size-3.5" />
          {d.evidence.length}
        </span>
      </TableCell>
    </TableRow>
  );
}

function PartyCell({
  name,
  initials,
  side,
}: {
  name?: string;
  initials?: string;
  side: "buyer" | "seller";
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar side={side} size={26} initials={initials || initialsOf(name)} />
      <span className="text-[13px]">{name || "—"}</span>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="grid gap-2 rounded-xl border border-border bg-card p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="ml-auto h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
