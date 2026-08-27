"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Skeleton } from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { Icon, type IconName } from "@/components/icon";
import { PayoutAccountDialog } from "@/components/payout/payout-account-dialog";
import { SectionError } from "@/components/settings/section-error";
import { SettingRow } from "@/components/settings/setting-row";
import { usePayout } from "@/hooks/use-payout";
import type { PayoutStatus } from "@/lib/api/payout";
import { card, note } from "@/lib/ui";

type Tone = "terminal" | "warning" | "info" | "success" | "error";

const LOOK: Record<PayoutStatus, { icon: IconName; tone: Tone; primaryCta: boolean }> = {
  none: { icon: "payment", tone: "warning", primaryCta: true },
  pending: { icon: "clock", tone: "info", primaryCta: false },
  active: { icon: "complete", tone: "success", primaryCta: false },
  rejected: { icon: "alert", tone: "error", primaryCta: true },
};

const BORDER: Record<Tone, string> = {
  terminal: "border-terminal-border",
  warning: "border-warning-border",
  info: "border-info-border",
  success: "border-success-border",
  error: "border-error-border",
};

const MEDALLION: Record<Tone, string> = {
  terminal: "bg-terminal-bg text-terminal",
  warning: "bg-warning-bg text-warning",
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
  error: "bg-error-bg text-error",
};

/**
 * Where the money goes when a sale completes.
 *
 * The four states are not decoration: `none` blocks deal creation, `pending` means Omise is
 * still deciding, `rejected` means a seller could otherwise sit waiting for a payout that
 * will never arrive. So the rejected card shows Omise's actual reason rather than a generic
 * failure — the reason is the only thing that tells them what to fix.
 */
export function PayoutSection() {
  const t = useTranslations("settings.payout");
  const payout = usePayout();

  const [dialogOpen, setDialogOpen] = React.useState(false);

  if (payout.isPending) return <Skeleton className="h-40 rounded-xl" />;
  if (payout.isError) return <SectionError onRetry={() => void payout.refetch()} />;

  const status = payout.data?.status ?? "none";
  const look = LOOK[status];

  return (
    <div className="grid gap-3.5">
      <section className={cn(card, BORDER[look.tone])}>
        <div className="flex flex-wrap items-start gap-3.5">
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-lg",
              MEDALLION[look.tone]
            )}
          >
            <Icon name={look.icon} className="size-5.5" />
          </span>
          <div className="min-w-40 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <strong className="text-[15px]">
                {payout.data?.destination ?? t(`status.${status}.title`)}
              </strong>
              <Badge variant={look.tone} className="whitespace-nowrap">
                {t(`status.${status}.badge`)}
              </Badge>
            </div>
            <p className={cn(note, "mt-1 max-w-[56ch] text-[13px]")}>
              {t(`status.${status}.body`)}
            </p>

            {status === "rejected" ? (
              <div className="mt-3 flex gap-2 rounded-lg border border-error-border bg-error-bg px-3 py-2.5 text-[12.5px] text-error">
                <Icon name="warning" className="size-4 shrink-0" />
                <span>
                  <strong>{t("reason")}:</strong>{" "}
                  {payout.data?.rejectionReason ?? t("reasonUnknown")}
                </span>
              </div>
            ) : null}
          </div>
          <Button
            variant={look.primaryCta ? "default" : "outline"}
            className="max-w-full shrink-0 whitespace-nowrap max-sm:w-full max-sm:justify-center"
            loading={status === "pending" && payout.isFetching}
            onClick={() =>
              status === "pending" ? void payout.refetch() : setDialogOpen(true)
            }
          >
            {t(`status.${status}.cta`)}
          </Button>
        </div>
      </section>

      <PayoutAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        status={status}
        destination={payout.data?.destination}
        rejectionReason={payout.data?.rejectionReason}
      />

      <div className={card}>
        <SettingRow
          label={t("history")}
          description={t("historyHint")}
          actions={[{ label: t("viewHistory"), kind: "ghost", disabledReason: t("historySoon") }]}
          last
        />
      </div>
    </div>
  );
}
