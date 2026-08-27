"use client";

import { useTranslations } from "next-intl";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ds";
import { Icon } from "@/components/icon";
import { PayoutBankForm } from "@/components/payout/payout-bank-form";
import { useStartPayoutOnboarding } from "@/hooks/use-payout";
import type { PayoutStatus } from "@/lib/api/payout";
import { cn } from "@/lib/ds-utils";
import { note } from "@/lib/ui";

/**
 * In-app payout management, so a seller never leaves Account settings to connect or fix their
 * bank. `none`/`rejected` collect details (backend-supported); `active` is read-only — the
 * backend never creates a second recipient (golden rule 3b), so there is no honest "replace"
 * to offer here yet, only the current destination and where to go to change it.
 */
export function PayoutAccountDialog({
  open,
  onOpenChange,
  status,
  destination,
  rejectionReason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: PayoutStatus;
  destination?: string;
  rejectionReason?: string;
}) {
  const t = useTranslations("settings.payout");
  const td = useTranslations("settings.payout.dialog");
  const tCommon = useTranslations("common");
  const start = useStartPayoutOnboarding();

  const collecting = status === "none" || status === "rejected";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]" closeLabel={tCommon("close")}>
        <DialogTitle>{collecting ? td("connectTitle") : td("manageTitle")}</DialogTitle>
        <DialogDescription>
          {collecting ? td("connectBody") : t("status.active.body")}
        </DialogDescription>

        {status === "rejected" ? (
          <Alert variant="error">
            <AlertTitle>{t("reason")}</AlertTitle>
            <AlertDescription>{rejectionReason ?? t("reasonUnknown")}</AlertDescription>
          </Alert>
        ) : null}

        {collecting ? (
          <PayoutBankForm
            submitting={start.isPending}
            onSubmit={(values) =>
              start.mutate(values, { onSuccess: () => onOpenChange(false) })
            }
          />
        ) : (
          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-success-border bg-success-bg/50 px-4 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-bg text-success">
                <Icon name="complete" className="size-5" />
              </span>
              <strong className="text-[15px]">{destination ?? t("status.active.title")}</strong>
            </div>
            <p className={cn(note, "text-[13px]")}>{td("replaceNote")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
