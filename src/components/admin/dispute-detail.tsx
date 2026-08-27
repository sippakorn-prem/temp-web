"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
  EscrowTimeline,
  MoneyFee,
  Skeleton,
  StatusCard,
  type TimelineStep,
} from "@/components/ds";
import { Icon } from "@/components/icon";
import { useAdminDispute } from "@/hooks/use-disputes";
import { ApiError } from "@/lib/api/client";
import {
  disputeActive,
  refundNeedsPayout,
  refundPaidOut,
  type Dispute,
} from "@/lib/domain/dispute";
import { toast } from "sonner";
import { useResolveDispute } from "@/hooks/use-disputes";
import { formatDateTime } from "@/lib/format";
import { formatBaht } from "@/lib/money";
import { cn } from "@/lib/ds-utils";
import { code as codeClass, note } from "@/lib/ui";
import { EvidenceThread } from "./evidence-thread";
import { ResolvePanel } from "./resolve-panel";
import { Avatar, initialsOf, statusVariant } from "./shared";

export function DisputeDetail({ id }: { id: string }) {
  const t = useTranslations("admin.disputes");
  const tDispute = useTranslations("dispute");
  const locale = useLocale();
  const query = useAdminDispute(id);
  const [lightbox, setLightbox] = React.useState<{ url: string; label: string } | null>(null);

  if (query.isPending) {
    return <Skeleton className="h-[70vh] w-full rounded-xl" />;
  }
  if (query.isError) {
    const forbidden = query.error instanceof ApiError && query.error.status === 403;
    return (
      <div className="rounded-xl border border-border bg-card p-0">
        <EmptyState
          tone={forbidden ? "error" : "default"}
          icon={() => <Icon name="protection" />}
          title={forbidden ? t("forbiddenTitle") : t("notFound")}
          action={
            <Button variant="outline" asChild>
              <Link href="/admin/disputes">{t("back")}</Link>
            </Button>
          }
        >
          {forbidden ? t("forbiddenBody") : ""}
        </EmptyState>
      </div>
    );
  }

  const d = query.data;
  const actionable = disputeActive(d.status);
  const needsPayout = refundNeedsPayout(d);
  const amount = formatBaht(d.amountSatang ?? 0, locale);

  return (
    <div className="grid gap-4">
      <Link
        href="/admin/disputes"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon name="close" className="size-3.5 rotate-45" />
        {t("back")}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={cn(codeClass, "text-[20px] text-foreground")}>{d.dealCode}</h1>
            <Badge variant={statusVariant(d.status)}>{tDispute(`status.${d.status}`)}</Badge>
          </div>
          {d.itemTitle ? <p className={cn(note, "mt-1")}>{d.itemTitle}</p> : null}
        </div>
        <div className="text-right">
          <div className={cn(note, "text-xs")}>{t("amountHeld")}</div>
          <div className="font-mono text-[26px] font-bold tabular-nums">{amount}</div>
        </div>
      </div>

      {needsPayout ? (
        <Alert variant="warning">
          <Icon name="alert" />
          <AlertTitle>{t("manualTitle")}</AlertTitle>
          <AlertDescription>{t("manualBody")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <SummaryCard d={d} />
          <ClaimCard d={d} reason={tDispute(`reasons.${d.reason}`)} />
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3.5 flex items-start justify-between gap-3">
              <div>
                <strong className="text-sm">{t("evidenceTitle")}</strong>
                <p className={cn(note, "mt-0.5 text-xs")}>{t("evidenceSub")}</p>
              </div>
              <span className={cn(note, "text-[11px]")}>{t("newestLast")}</span>
            </div>
            <EvidenceThread dispute={d} actionable={actionable} onView={(url, label) => setLightbox({ url, label })} />
          </section>
        </div>

        <div>
          <div className="sticky top-4 grid gap-3.5">
            {actionable ? <ResolvePanel dispute={d} /> : <ResolvedCard d={d} />}
          </div>
        </div>
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-8 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="w-full max-w-[760px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between text-white">
              <strong className="text-sm">{lightbox.label}</strong>
              <Button variant="outline" size="sm" onClick={() => setLightbox(null)}>
                {t("close")}
              </Button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.label}
              className="max-h-[64vh] w-full rounded-xl bg-black object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ d }: { d: Dispute }) {
  const t = useTranslations("admin.disputes");
  const locale = useLocale();

  const step = (
    id: string,
    title: string,
    iso: string | undefined | null,
    state: TimelineStep["state"],
    tag?: string
  ): TimelineStep => ({
    id,
    title,
    detail: iso ? (formatDateTime(iso, locale) ?? "—") : "—",
    state,
    tag,
  });

  const steps: TimelineStep[] = [
    step("created", t("tlCreated"), d.dealCreatedAt, "done"),
    step("paid", t("tlPaid"), d.fundedAt, d.fundedAt ? "done" : "upcoming"),
    step("shipped", d.shippedAt ? t("tlShipped") : t("tlNotShipped"), d.shippedAt, d.shippedAt ? "done" : "upcoming"),
    step(
      "delivered",
      d.deliveredAt ? t("tlDelivered") : t("tlNotDelivered"),
      d.deliveredAt,
      d.deliveredAt ? "done" : "upcoming"
    ),
    step("opened", t("tlOpened"), d.createdAt, "problem", t("tlNow")),
  ];

  const refundMethod =
    d.paymentMethod === "card"
      ? t("paymentCard")
      : d.paymentMethod === "promptpay"
        ? t("paymentPromptpay")
        : t("paymentUnknown");

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <strong className="text-sm">{t("summaryTitle")}</strong>
      <div className="mt-3.5 grid gap-6 md:grid-cols-2">
        <div className="grid gap-3.5">
          <Party name={d.buyer?.name} initials={d.buyer?.initials} side="buyer" role={t("roleBuyer")} />
          <Party name={d.seller?.name} initials={d.seller?.initials} side="seller" role={t("roleSeller")} />
          <div className="mt-1">
            <Kv label={t("item")} value={d.itemTitle || "—"} />
            <Kv label={t("amountHeld")} value={formatBaht(d.amountSatang ?? 0, locale)} mono />
            <Kv label={t("refundMethod")} value={refundMethod} />
          </div>
        </div>
        <div>
          <div className={cn(note, "mb-3 text-[11px] tracking-[0.06em] uppercase")}>{t("timeline")}</div>
          <EscrowTimeline steps={steps} label={t("timeline")} />
        </div>
      </div>
    </section>
  );
}

function Party({
  name,
  initials,
  side,
  role,
}: {
  name?: string;
  initials?: string;
  side: "buyer" | "seller";
  role: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar side={side} initials={initials || initialsOf(name)} />
      <div>
        <div className="text-[13px] font-semibold">{name || "—"}</div>
        <div className={cn(note, "text-[11px]")}>{role}</div>
      </div>
    </div>
  );
}

function Kv({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-[13px] last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <strong className={cn("text-right", mono && "font-mono tabular-nums")}>{value}</strong>
    </div>
  );
}

function ClaimCard({ d, reason }: { d: Dispute; reason: string }) {
  const t = useTranslations("admin.disputes");
  const locale = useLocale();
  return (
    <section className="rounded-xl border border-info-border bg-info-bg/40 p-5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <strong className="text-sm">{t("claimTitle")}</strong>
        <Badge variant="default">{reason}</Badge>
      </div>
      <p className="text-sm leading-relaxed">{d.description || t("noClaim")}</p>
      <p className={cn(note, "mt-2.5 text-[11px]")}>
        {t("claimBy")} {d.buyer?.name || t("roleBuyer")} · {formatDateTime(d.createdAt, locale)}
      </p>
    </section>
  );
}

function ResolvedCard({ d }: { d: Dispute }) {
  const t = useTranslations("admin.disputes");
  const locale = useLocale();
  const { markRefundPaid } = useResolveDispute(d.id);
  const forSeller = d.status === "resolved_seller";
  const needsPayout = refundNeedsPayout(d);
  const paidOut = refundPaidOut(d);

  return (
    <div className="grid gap-3.5">
      <StatusCard
        state={needsPayout ? "action" : "complete"}
        badge={
          <Badge variant={needsPayout ? "warning" : "success"}>
            {forSeller ? t("resolvedForSeller") : t("resolvedForBuyer")}
          </Badge>
        }
        label={forSeller ? t("resolvedForSeller") : t("resolvedForBuyer")}
        title={forSeller ? t("outcomeSellerTitle") : t("outcomeBuyerTitle")}
        meta={[
          { id: "by", label: t("resolvedBy"), value: d.resolvedByName || "—" },
          { id: "at", label: t("resolvedAt"), value: d.resolvedAt ? (formatDateTime(d.resolvedAt, locale) ?? "—") : "—" },
        ]}
      >
        <p className="text-[13px]">{forSeller ? t("outcomeSellerBody") : t("outcomeBuyerBody")}</p>
        {d.resolutionNote ? (
          <div className="mt-3.5">
            <div className={cn(note, "mb-1.5 text-[11px] tracking-[0.06em] uppercase")}>
              {t("resolutionNoteLabel")}
            </div>
            <p className="rounded-lg bg-muted p-3 text-[13px] leading-relaxed">{d.resolutionNote}</p>
          </div>
        ) : null}
      </StatusCard>

      {needsPayout ? (
        <>
          <MoneyFee
            rows={[{ id: "amount", label: t("amountHeld"), value: formatBaht(d.amountSatang ?? 0, locale) }]}
            disclosure={t("promptpayNote")}
          />
          <Button
            variant="outline"
            className="w-full"
            loading={markRefundPaid.isPending}
            onClick={() =>
              markRefundPaid.mutate(d.id, {
                onSuccess: () => toast.success(t("markPaidToast")),
                onError: () => toast.error(t("failedToast")),
              })
            }
          >
            <Icon name="check" className="size-4" />
            {t("markPaidOut")}
          </Button>
        </>
      ) : null}

      {paidOut && !forSeller ? (
        <div className="flex items-center gap-2 rounded-lg bg-success-bg px-3 py-2.5 text-[12px] font-semibold text-success">
          <Icon name="check" className="size-3.5" />
          {t("refundPaidOutLabel")}
        </div>
      ) : null}

      <p className={cn(note, "text-center text-[11px]")}>{t("readonlyHint")}</p>
    </div>
  );
}
