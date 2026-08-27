"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ds";
import { Icon } from "@/components/icon";
import { SettingRow } from "@/components/settings/setting-row";
import { useDeals } from "@/hooks/use-deals";
import type { ConsentRecord } from "@/lib/api/consent";
import { escrowHoldsMoney } from "@/lib/domain/deal";
import { formatDate } from "@/lib/format";
import { formatBaht } from "@/lib/money";
import { cn } from "@/lib/ds-utils";
import { card, money, note } from "@/lib/ui";

/**
 * Privacy and data (PDPA): what the user consented to, how to get a copy of their data,
 * and how to leave.
 *
 * Deletion is guarded by a hard fact rather than a warning: if SafeDeal is holding money
 * for this user, the account cannot go. Deleting it would strand funds mid-escrow with no
 * party to return them to, so the dialog names the deals and the amount instead of asking
 * them to confirm something we would refuse anyway.
 */
export function PrivacySection() {
  const t = useTranslations("settings.privacy");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useUser();
  const deals = useDeals();
  const [confirming, setConfirming] = React.useState(false);

  const consent = user?.unsafeMetadata?.consent as ConsentRecord | undefined;
  const consentDate = consent?.acceptedAt
    ? formatDate(consent.acceptedAt, locale)
    : null;

  const holding = (deals.data ?? []).filter((deal) => escrowHoldsMoney(deal.status));
  const blocked = holding.length > 0;
  const total = holding.reduce((sum, deal) => sum + deal.amountSatang, 0);

  return (
    <>
      <div className={cn(card, "mb-4")}>
        <SettingRow
          label={t("consent")}
          value={
            consent
              ? t("consentValue", { version: consent.version, date: consentDate ?? "—" })
              : t("consentMissing")
          }
          mono={Boolean(consent)}
          badge={
            consent
              ? { tone: "success", text: t("consentGiven") }
              : { tone: "terminal", text: t("consentUnknown") }
          }
          actions={[{ label: t("viewDocuments"), kind: "ghost", href: "/legal/privacy" }]}
        />
        <SettingRow
          label={t("export")}
          description={t("exportHint")}
          actions={[{ label: t("requestExport"), disabledReason: tCommon("notYetBuilt") }]}
          last
        />
      </div>

      <section
        className={cn(
          card,
          "border-error-border bg-[color-mix(in_srgb,var(--color-error-bg)_34%,var(--color-card))]"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-destructive">
              <Icon name="warning" className="size-4.5" />
              <strong className="text-sm">{t("dangerZone")}</strong>
            </div>
            <p className={cn(note, "mt-1 max-w-[60ch] text-[12.5px]")}>{t("deleteHint")}</p>
          </div>
          <Button
            variant="destructive"
            className="shrink-0 whitespace-nowrap"
            onClick={() => setConfirming(true)}
          >
            {t("deleteAccount")}
          </Button>
        </div>
      </section>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          closeLabel={tCommon("close")}
          showCloseButton={false}
          className="max-w-115"
        >
          {blocked ? (
            <>
              <div className="flex items-center gap-2.5 text-warning">
                <Icon name="warning" className="size-5.5" />
                <DialogTitle className="text-[17px] text-foreground">
                  {t("blockedTitle")}
                </DialogTitle>
              </div>
              <p className={note}>
                {t("blockedBody", { count: holding.length, total: formatBaht(total) })}
              </p>
              <div className="my-1 grid gap-2 rounded-lg border border-border bg-muted p-3">
                {holding.map((deal) => (
                  <div key={deal.code} className="flex justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate">
                      {deal.title} · {deal.code}
                    </span>
                    <span className={cn(money, "shrink-0")}>
                      {formatBaht(deal.amountSatang)}
                    </span>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  {t("close")}
                </Button>
                <Button asChild>
                  <Link href="/dashboard">{t("goToDeals")}</Link>
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 text-destructive">
                <Icon name="warning" className="size-5.5" />
                <DialogTitle className="text-[17px] text-foreground">
                  {t("confirmTitle")}
                </DialogTitle>
              </div>
              <p className={note}>{t("confirmBody")}</p>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  {tCommon("cancel")}
                </Button>
                {/* TODO(backend): deletion has to be server-side. Calling Clerk's
                    `user.delete()` from here would erase the identity while our database
                    still holds their deals, audit trail and PDPA records — orphaning
                    exactly the data a regulator would ask us to produce. */}
                <Button variant="destructive" disabled title={tCommon("notYetBuilt")}>
                  {t("deletePermanently")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
