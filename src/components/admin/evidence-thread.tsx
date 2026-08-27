"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button, FormField } from "@/components/ds";
import { Icon } from "@/components/icon";
import { useAddAdminEvidence } from "@/hooks/use-disputes";
import { uploadPrivateFiles } from "@/lib/api/uploads";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/ds-utils";
import { note } from "@/lib/ui";
import type { Dispute, DisputeEvidence, EvidenceSide } from "@/lib/domain/dispute";
import { Avatar, initialsOf } from "./shared";

export function EvidenceThread({
  dispute,
  actionable,
  onView,
}: {
  dispute: Dispute;
  actionable: boolean;
  onView: (url: string, label: string) => void;
}) {
  const t = useTranslations("admin.disputes");

  return (
    <div className="grid gap-4">
      {dispute.evidence.length === 0 ? (
        <p className={cn(note, "text-sm")}>{t("evidenceEmpty")}</p>
      ) : (
        <div className="grid gap-3.5">
          {dispute.evidence.map((e) => (
            <EvidenceBubble key={e.id} e={e} dispute={dispute} onView={onView} />
          ))}
        </div>
      )}

      {actionable ? <AddEvidence dispute={dispute} /> : null}
    </div>
  );
}

function roleMeta(side: EvidenceSide, dispute: Dispute, t: (k: string) => string) {
  switch (side) {
    case "buyer":
      return { label: t("roleBuyer"), name: dispute.buyer?.name ?? "", initials: dispute.buyer?.initials ?? initialsOf(dispute.buyer?.name) };
    case "seller":
      return { label: t("roleSeller"), name: dispute.seller?.name ?? "", initials: dispute.seller?.initials ?? initialsOf(dispute.seller?.name) };
    default:
      return { label: t("roleAdmin"), name: t("roleAdmin"), initials: "SD" };
  }
}

function EvidenceBubble({
  e,
  dispute,
  onView,
}: {
  e: DisputeEvidence;
  dispute: Dispute;
  onView: (url: string, label: string) => void;
}) {
  const t = useTranslations("admin.disputes");
  const locale = useLocale();
  const side: EvidenceSide = e.side ?? "admin";
  const meta = roleMeta(side, dispute, t);
  const isImage = (e.contentType ?? "").startsWith("image/");

  return (
    <div
      className={cn(
        "flex max-w-[88%] gap-3",
        side === "seller" && "ml-auto flex-row-reverse",
        side === "admin" && "max-w-full"
      )}
    >
      <Avatar side={side} initials={meta.initials} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "rounded-2xl border p-3.5",
            side === "buyer" && "border-info-border bg-info-bg",
            side === "seller" && "border-border bg-secondary",
            side === "admin" && "border-dashed bg-muted"
          )}
        >
          <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
            <span className="text-[11px] font-bold tracking-[0.06em] uppercase" style={{ color: sideColor(side) }}>
              {meta.label}
            </span>
            {meta.name ? <span className="text-[13px] font-semibold">{meta.name}</span> : null}
            <span className="ml-auto text-[11px] whitespace-nowrap text-muted-foreground">
              {formatDateTime(e.createdAt, locale)}
            </span>
          </div>
          {e.note ? <p className="text-[13px] leading-relaxed">{e.note}</p> : null}
          {e.mediaUrl ? (
            <div className="mt-2.5 flex items-center gap-2.5">
              {isImage ? (
                <button
                  type="button"
                  onClick={() => onView(e.mediaUrl!, t("attachment"))}
                  className="size-[78px] w-[104px] shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-border bg-muted p-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.mediaUrl} alt={t("attachment")} className="size-full object-cover" />
                </button>
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
                  <Icon name="file" className="size-5" />
                </span>
              )}
              <div className="grid gap-1.5">
                <span className="text-[12px] font-semibold">{t("attachment")}</span>
                <a
                  href={e.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center gap-1 text-[12px] font-semibold text-primary underline"
                >
                  {t("viewFull")}
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function sideColor(side: EvidenceSide): string {
  return side === "buyer" ? "var(--info)" : side === "seller" ? "var(--terminal)" : "var(--primary)";
}

function AddEvidence({ dispute }: { dispute: Dispute }) {
  const t = useTranslations("admin.disputes");
  const add = useAddAdminEvidence(dispute.id);
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!text.trim() && files.length === 0) return;
    setBusy(true);
    try {
      let media;
      if (files.length > 0) {
        const [uploaded] = await uploadPrivateFiles(files, "dispute", dispute.dealCode);
        media = uploaded;
      }
      await add.mutateAsync({ note: text.trim() || undefined, media });
      setText("");
      setFiles([]);
      setOpen(false);
      toast.success(t("evidenceToast"));
    } catch {
      toast.error(t("failedToast"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon name="plus" className="size-3.5" />
        {t("addEvidence")}
      </button>
    );
  }

  return (
    <div className="grid gap-3 border-t border-dashed border-border pt-4">
      <FormField
        textarea
        rows={3}
        label={t("addEvidence")}
        placeholder={t("addNotePh")}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" loading={busy} onClick={() => void submit()}>
          {t("submit")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
