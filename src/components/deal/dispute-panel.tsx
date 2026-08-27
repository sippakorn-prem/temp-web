"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormField,
} from "@/components/ds";
import { useAddDisputeEvidence, useCancelDispute, useDealDispute, useOpenDispute } from "@/hooks/use-disputes";
import { uploadPrivateFiles } from "@/lib/api/uploads";
import { cn } from "@/lib/ds-utils";
import { canCancelDispute, DISPUTE_REASONS, type DisputeReason } from "@/lib/domain/dispute";
import type { Deal } from "@/lib/domain/deal";
import { note as noteClass } from "@/lib/ui";

/** Buyer-facing dialog to open a dispute (reason + description). */
export function OpenDisputeDialog({
  deal,
  open,
  onOpenChange,
}: {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("dispute");
  const tCommon = useTranslations("common");
  const mutation = useOpenDispute(deal.code);
  const [reason, setReason] = React.useState<DisputeReason>("not_as_described");
  const [description, setDescription] = React.useState("");

  function submit() {
    mutation.mutate(
      { reason, description: description.trim() },
      {
        onSuccess: () => {
          toast.success(t("openedToast"));
          onOpenChange(false);
          setDescription("");
        },
        onError: () => toast.error(t("failedToast")),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]" closeLabel={tCommon("close")}>
        <DialogTitle>{t("openTitle")}</DialogTitle>
        <DialogDescription>{t("openBody")}</DialogDescription>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("reasonLabel")}</span>
            {/* Native select — the DS has no Select primitive yet. */}
            <select
              className="h-10 rounded-lg border bg-card px-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value as DisputeReason)}
            >
              {DISPUTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`reasons.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <FormField
            textarea
            rows={4}
            label={t("descriptionLabel")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            {t("openCta")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The in_dispute view for both participants: status, evidence thread, add evidence, cancel. */
export function DisputeView({ deal }: { deal: Deal }) {
  const t = useTranslations("dispute");
  const query = useDealDispute(deal.code, deal.status === "in_dispute");
  const addEvidence = useAddDisputeEvidence(deal.code);
  const cancel = useCancelDispute(deal.code);
  const [evidenceNote, setEvidenceNote] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);

  const dispute = query.data;
  if (!dispute) {
    return <p className={noteClass}>{query.isLoading ? t("loading") : t("notFound")}</p>;
  }
  // Only the buyer opens a dispute, so the viewing buyer is the opener.
  const isOpener = deal.role === "buyer";

  async function submitEvidence() {
    if (!evidenceNote.trim() && files.length === 0) return;
    setBusy(true);
    try {
      let media;
      if (files.length > 0) {
        const [uploaded] = await uploadPrivateFiles(files, "dispute", deal.code);
        media = uploaded;
      }
      await addEvidence.mutateAsync({ id: dispute!.id, note: evidenceNote.trim() || undefined, media });
      setEvidenceNote("");
      setFiles([]);
      toast.success(t("evidenceToast"));
    } catch {
      toast.error(t("failedToast"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <strong>{t(`reasons.${dispute.reason}`)}</strong>
          {dispute.description ? <p className={cn(noteClass, "mt-0.5 text-sm")}>{dispute.description}</p> : null}
        </div>
        <Badge variant={dispute.status === "open" ? "warning" : "info"}>{t(`status.${dispute.status}`)}</Badge>
      </div>

      {dispute.resolutionNote ? (
        <Alert variant="info">
          <AlertTitle>{t("resolutionTitle")}</AlertTitle>
          <AlertDescription>{dispute.resolutionNote}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <span className="text-sm font-medium">{t("evidenceTitle")}</span>
        {dispute.evidence.length === 0 ? (
          <p className={cn(noteClass, "text-sm")}>{t("evidenceEmpty")}</p>
        ) : (
          <ul className="grid gap-2">
            {dispute.evidence.map((e) => (
              <li key={e.id} className="rounded-lg border bg-card p-3 text-sm">
                {e.note ? <p>{e.note}</p> : null}
                {e.mediaUrl ? (
                  <a href={e.mediaUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                    {t("evidenceAttachment")}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {dispute.status === "open" || dispute.status === "under_review" ? (
        <div className="grid gap-2 border-t pt-4">
          <FormField
            textarea
            rows={3}
            label={t("addEvidenceLabel")}
            value={evidenceNote}
            onChange={(e) => setEvidenceNote(e.target.value)}
          />
          <input type="file" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="text-sm" />
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" loading={busy} onClick={() => void submitEvidence()}>
              {t("addEvidenceCta")}
            </Button>
            {canCancelDispute(dispute.status, isOpener) ? (
              <Button
                variant="ghost"
                loading={cancel.isPending}
                onClick={() =>
                  cancel.mutate(dispute.id, {
                    onSuccess: () => toast.success(t("cancelledToast")),
                    onError: () => toast.error(t("failedToast")),
                  })
                }
              >
                {t("cancelCta")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
