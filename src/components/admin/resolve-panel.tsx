"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Button,
  ConfirmationDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormField,
} from "@/components/ds";
import { Icon } from "@/components/icon";
import { useResolveDispute } from "@/hooks/use-disputes";
import { formatDateTime } from "@/lib/format";
import { formatBaht } from "@/lib/money";
import { cn } from "@/lib/ds-utils";
import { note } from "@/lib/ui";
import type { Dispute } from "@/lib/domain/dispute";

type DialogKind = null | "shape" | "review" | "buyer" | "seller";

/** The admin decision surface for an active dispute: a required note, then take-under-review or a
 *  guarded resolve (buyer → choose shape → confirm; seller → confirm). */
export function ResolvePanel({ dispute }: { dispute: Dispute }) {
  const t = useTranslations("admin.disputes");
  const locale = useLocale();
  const { review, forBuyer, forSeller } = useResolveDispute(dispute.id);
  const [text, setText] = React.useState("");
  const [noteErr, setNoteErr] = React.useState(false);
  const [dialog, setDialog] = React.useState<DialogKind>(null);

  const isOpen = dispute.status === "open";
  const isUnderReview = dispute.status === "under_review";
  const pending = review.isPending || forBuyer.isPending || forSeller.isPending;

  function requireNote(): boolean {
    if (!text.trim()) {
      setNoteErr(true);
      return false;
    }
    return true;
  }

  function done(message: string) {
    setDialog(null);
    setText("");
    toast.success(message);
  }
  const fail = () => toast.error(t("failedToast"));

  function confirmReview() {
    review.mutate(dispute.id, { onSuccess: () => done(t("reviewedToast")), onError: fail });
  }
  function confirmBuyer() {
    forBuyer.mutate({ id: dispute.id, note: text.trim() }, { onSuccess: () => done(t("resolvedToast")), onError: fail });
  }
  function confirmSeller() {
    forSeller.mutate({ id: dispute.id, note: text.trim() }, { onSuccess: () => done(t("resolvedToast")), onError: fail });
  }

  const amount = formatBaht(dispute.amountSatang ?? 0, locale);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <strong className="text-sm">{t("decision")}</strong>
      <p className={cn(note, "mt-1 text-xs")}>{t("decisionSub")}</p>

      <div className="mt-4">
        <FormField
          textarea
          rows={4}
          required
          label={t("resolutionNote")}
          placeholder={t("notePh")}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setNoteErr(false);
          }}
          error={noteErr ? t("noteRequired") : undefined}
        />
      </div>

      <div className="mt-4 grid gap-2.5">
        {isOpen ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => requireNote() && setDialog("review")}
          >
            <Icon name="protection" className="size-4" />
            {t("takeReview")}
          </Button>
        ) : null}
        {isUnderReview ? (
          <div className="flex items-center gap-2 rounded-lg bg-info-bg px-3 py-2.5 text-[12px] font-semibold text-info">
            <Icon name="clock" className="size-3.5" />
            {t("underReviewSince", { when: formatDateTime(dispute.createdAt, locale) ?? "" })}
          </div>
        ) : null}

        <div className="my-1 border-t border-border" />

        <Button className="w-full" onClick={() => requireNote() && setDialog("shape")}>
          <Icon name="refund" className="size-4" />
          {t("resolveBuyer")}
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => requireNote() && setDialog("seller")}>
          <Icon name="complete" className="size-4" />
          {t("resolveSeller")}
        </Button>
      </div>

      <p className={cn(note, "mt-3 text-[11px] leading-relaxed")}>{t("irreversibleHint")}</p>

      {/* Choose the buyer-win shape: refund-only (v1) or return-then-refund (not built yet). */}
      <Dialog open={dialog === "shape"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-[460px]" closeLabel={t("cancel")}>
          <DialogTitle>{t("chooseShape")}</DialogTitle>
          <DialogDescription>{t("chooseShapeSub")}</DialogDescription>
          <div className="mt-4 grid gap-2.5">
            <label className="flex cursor-pointer gap-3 rounded-lg border border-primary bg-accent p-3">
              <input type="radio" name="shape" defaultChecked className="mt-1" />
              <span className="grid gap-0.5">
                <strong className="text-sm">{t("shapeRefund")}</strong>
                <span className={cn(note, "text-xs")}>{t("shapeRefundDesc")}</span>
              </span>
            </label>
            <label className="flex cursor-not-allowed gap-3 rounded-lg border border-border p-3 opacity-60">
              <input type="radio" name="shape" disabled className="mt-1" />
              <span className="grid gap-0.5">
                <span className="flex items-center gap-2">
                  <strong className="text-sm">{t("shapeReturn")}</strong>
                  <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-bold text-warning">
                    {t("comingSoon")}
                  </span>
                </span>
                <span className={cn(note, "text-xs")}>{t("shapeReturnDesc")}</span>
              </span>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => setDialog("buyer")}>{t("continue")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={dialog === "review"}
        title={t("confirmReviewTitle")}
        consequence={t("confirmReviewBody")}
        cancelLabel={t("back")}
        confirmLabel={t("confirmReviewCta")}
        closeLabel={t("cancel")}
        onCancel={() => setDialog(null)}
        onConfirm={confirmReview}
      />
      <ConfirmationDialog
        open={dialog === "buyer"}
        title={t("confirmBuyerTitle")}
        amount={amount}
        consequence={t("confirmBuyerBody")}
        warning={dispute.paymentMethod === "promptpay" ? t("manualBody") : undefined}
        cancelLabel={t("back")}
        confirmLabel={t("confirmBuyerCta")}
        closeLabel={t("cancel")}
        onCancel={() => setDialog(null)}
        onConfirm={confirmBuyer}
      />
      <ConfirmationDialog
        open={dialog === "seller"}
        title={t("confirmSellerTitle")}
        amount={amount}
        consequence={t("confirmSellerBody")}
        cancelLabel={t("back")}
        confirmLabel={t("confirmSellerCta")}
        closeLabel={t("cancel")}
        onCancel={() => setDialog(null)}
        onConfirm={confirmSeller}
      />

      {pending ? <span className="sr-only">…</span> : null}
    </div>
  );
}
