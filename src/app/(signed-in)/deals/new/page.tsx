"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeftIcon, ChevronRightIcon, FileTextIcon, LockKeyholeIcon, ShieldCheckIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { AppLayout } from "@/components/app-layout";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  EvidenceUpload,
  FormField,
  MoneyFee,
  Skeleton,
} from "@/components/ds";
import { DealShareCard } from "@/components/deal/deal-share-card";
import { StepRail } from "@/components/deal/step-rail";
import { useDealPolicy } from "@/hooks/use-deals";
import { usePayout } from "@/hooks/use-payout";
import { createDeal, type MediaInput } from "@/lib/api/deals";
import { uploadPrivateFiles } from "@/lib/api/uploads";
import { cn } from "@/lib/ds-utils";
import { feeBreakdown, formatBaht, formatFeePercent, parseBahtToSatang } from "@/lib/money";
import { note } from "@/lib/ui";

const schema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000),
  agreement: z.string().trim().min(1).max(3000),
  price: z.string().refine((value) => (parseBahtToSatang(value) ?? 0) > 0),
  preferredCarrier: z.string().min(1),
  confirmed: z.boolean().refine((value) => value),
});
type Values = z.infer<typeof schema>;
type SelectedFile = { id: string; file: File };

export default function CreateDealPage() {
  const t = useTranslations("dealFlow.create");
  const common = useTranslations("common");
  const tPolicy = useTranslations("dealPolicy");
  const [step, setStep] = React.useState(0);
  const [files, setFiles] = React.useState<SelectedFile[]>([]);
  const previewURLs = useFilePreviewURLs(files);
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null);
  const [uploaded, setUploaded] = React.useState<MediaInput[]>([]);
  const [busy, setBusy] = React.useState(false);
  const payout = usePayout();
  const eligible = payout.data?.canCreateDeal === true;
  const policy = useDealPolicy(eligible);
  const feeBPS = policy.data?.sellerFeeBPS ?? null;
  const [created, setCreated] = React.useState<{ code: string; amountSatang: number; feeBPS: number } | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      agreement: "",
      price: "",
      preferredCarrier: "Thailand Post EMS",
      confirmed: false,
    },
  });
  const amount = parseBahtToSatang(form.watch("price")) ?? 0;
  const confirmed = form.watch("confirmed");

  async function next() {
    const fields: Array<Array<keyof Values>> = [["title", "description", "agreement"], ["price", "preferredCarrier"], [], []];
    if (await form.trigger(fields[step])) goToStep(Math.min(3, step + 1));
  }

  function goToStep(nextStep: number) {
    form.clearErrors();
    setStep(nextStep);
  }

  async function submit(values: Values) {
    if (feeBPS === null) {
      toast.error(tPolicy("errorTitle"), { description: tPolicy("errorBody") });
      return;
    }
    setBusy(true);
    try {
      const media = files.length && uploaded.length !== files.length
        ? await uploadPrivateFiles(files.map(({ file }) => file), "product")
        : uploaded;
      setUploaded(media);
      const deal = await createDeal({
        title: values.title.trim(), description: values.description.trim(), agreement: values.agreement.trim(),
        amountSatang: parseBahtToSatang(values.price)!,
        preferredCarrier: values.preferredCarrier,
        media,
      });
      setCreated({ code: deal.code, amountSatang: deal.amountSatang, feeBPS });
      toast.success(t("createdToast"));
    } catch {
      toast.error(t("errorToast"));
    } finally { setBusy(false); }
  }

  function selectFiles(selected: File[]) {
    setUploaded([]);
    setFiles((current) => [
      ...current,
      ...selected.map((file) => ({ id: crypto.randomUUID(), file })),
    ].slice(0, 10));
  }

  function removeFile(id: React.Key) {
    setUploaded([]);
    setFiles((current) => current.filter((selected) => selected.id !== id));
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (step < 3) {
      event.preventDefault();
      void next();
      return;
    }
    void form.handleSubmit(submit)(event);
  }

  if (payout.isPending) {
    return <AppLayout><Skeleton className="mx-auto h-64 max-w-3xl rounded-xl" /></AppLayout>;
  }

  if (!eligible) {
    const contactReady = payout.data?.canJoinDeal === true;
    return (
      <AppLayout toolbar={<div><h1 className="text-[26px] font-bold">{t("title")}</h1><p className={cn(note, "mt-1")}>{t("subtitle")}</p></div>}>
        <Alert variant="warning" className="mx-auto max-w-3xl">
          <AlertTitle>{t("blockedTitle")}</AlertTitle>
          <AlertDescription>{t("blockedBody")}</AlertDescription>
          <div className="mt-4 flex flex-wrap gap-3">
            {!contactReady ? <Button asChild><Link href="/verify?returnTo=/deals/new">{t("verifyCta")}</Link></Button> : null}
            {payout.data?.status !== "active" ? <Button asChild variant={contactReady ? "default" : "outline"}><Link href="/onboarding/payout">{t("payoutCta")}</Link></Button> : null}
          </div>
        </Alert>
      </AppLayout>
    );
  }

  if (policy.isPending) {
    return <AppLayout><Skeleton className="mx-auto h-64 max-w-3xl rounded-xl" /></AppLayout>;
  }

  if (policy.isError || feeBPS === null) {
    return (
      <AppLayout toolbar={<div><h1 className="text-[26px] font-bold">{t("title")}</h1><p className={cn(note, "mt-1")}>{t("subtitle")}</p></div>}>
        <Alert variant="error" className="mx-auto max-w-3xl">
          <AlertTitle>{tPolicy("errorTitle")}</AlertTitle>
          <AlertDescription>{tPolicy("errorBody")}</AlertDescription>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void policy.refetch()}>
            {tPolicy("retry")}
          </Button>
        </Alert>
      </AppLayout>
    );
  }

  if (created) return <ShareResult code={created.code} amountSatang={created.amountSatang} feeBPS={created.feeBPS} />;

  const pricing = feeBreakdown(amount, feeBPS);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[880px]">
        <div>
          <h1 className="text-[26px] font-bold">{t("title")}</h1>
          <p className={cn(note, "mt-1")}>{t("subtitle")}</p>
        </div>
        <div className="mt-6">
          <StepRail
            step={step}
            labels={[t("steps.item"), t("steps.terms"), t("steps.protection"), t("steps.review")]}
            progressLabel={t("progressLabel")}
            onStepChange={goToStep}
          />
        </div>
        <Card className="mt-6 gap-0 py-0">
          <CardContent className="p-[clamp(20px,5vw,34px)]">
            <form onSubmit={handleFormSubmit} noValidate>
              {Object.keys(form.formState.errors).length > 0 ? (
                <Alert variant="error" className="mb-6">
                  <AlertTitle>{t("validationTitle")}</AlertTitle>
                  <AlertDescription>{t("validationBody")}</AlertDescription>
                </Alert>
              ) : null}

              {step === 0 ? (
                <div className="grid gap-5">
                  <Heading eyebrow={t("step", { current: 1 })} title={t("itemTitle")} body={t("itemBody")} />
                  <FormField label={t("titleLabel")} placeholder={t("titlePlaceholder")} required error={form.formState.errors.title?.message && t("required")} {...form.register("title")} />
                  <FormField textarea rows={4} label={t("descriptionLabel")} placeholder={t("descriptionPlaceholder")} error={form.formState.errors.description?.message} {...form.register("description")} />
                  <FormField textarea rows={4} label={t("agreementLabel")} hint={t("agreementHint")} placeholder={t("agreementPlaceholder")} required error={form.formState.errors.agreement?.message && t("required")} {...form.register("agreement")} />
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">{t("mediaLabel")} <span className="font-normal text-muted-foreground">· {common("optional")}</span></div>
                    <EvidenceUpload
                      inputLabel={t("uploadLabel")}
                      hint={t("uploadHint")}
                      constraints={t("uploadConstraints")}
                      accept="image/jpeg,image/png,application/pdf"
                      multiple
                      files={files.map(({ id, file }, index) => ({
                        id,
                        name: file.name,
                        size: formatFileSize(file.size),
                        status: t("fileSelected"),
                        icon: (
                          <MediaThumb
                            url={previewURLs[id]}
                            name={file.name}
                            isImage={file.type.startsWith("image/")}
                            label={t("previewFile", { name: file.name })}
                            className="size-full rounded-lg"
                            onOpen={() => setPreviewIndex(index)}
                          />
                        ),
                      }))}
                      note={<span className="flex items-center gap-2"><LockKeyholeIcon className="size-4 shrink-0" />{t("uploadPrivacy")}</span>}
                      removeLabel={() => t("removeFile")}
                      onFilesSelected={selectFiles}
                      onRemove={(selected) => removeFile(selected.id)}
                    />
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="grid gap-5">
                  <Heading eyebrow={t("step", { current: 2 })} title={t("termsTitle")} body={t("termsBody")} />
                  <FormField label={t("priceLabel")} prefix="฿" inputMode="decimal" placeholder="0.00" required error={form.formState.errors.price && t("priceError")} {...form.register("price")} />
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="preferred-carrier">{t("carrierLabel")}</label>
                    <select id="preferred-carrier" className="h-10 rounded-md border border-input bg-card px-3" {...form.register("preferredCarrier")}>
                      <option>Thailand Post EMS</option>
                      <option>Kerry Express</option>
                      <option>Flash Express</option>
                      <option>J&amp;T Express</option>
                      <option>DHL</option>
                    </select>
                  </div>
                  <MoneyFee
                    rows={[
                      { id: "buyer", label: t("buyerPays"), value: formatBaht(amount) },
                      { id: "fee", label: t("sellerFee", { percent: formatFeePercent(feeBPS) }), value: formatBaht(pricing.feeSatang) },
                    ]}
                    total={{ id: "net", label: t("youReceive"), value: formatBaht(pricing.netSatang) }}
                  />
                  <Alert variant="info">
                    <ShieldCheckIcon />
                    <AlertTitle>{t("escrowAlertTitle")}</AlertTitle>
                    <AlertDescription>{t("escrowAlertBody")}</AlertDescription>
                  </Alert>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-5">
                  <Heading eyebrow={t("step", { current: 3 })} title={t("protectionTitle")} body={t("protectionBody")} />
                  <Card className="gap-0 py-0 shadow-none">
                    <CardContent className="p-4 sm:p-[18px]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <strong>{t("recordedTermsTitle")}</strong>
                          <p className="mt-1 text-sm text-muted-foreground">{t("recordedTermsBody")}</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => goToStep(0)}>{common("edit")}</Button>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{form.getValues("agreement")}</p>
                    </CardContent>
                  </Card>
                  <Alert>
                    <ShieldCheckIcon />
                    <AlertTitle>{t("automaticReleaseTitle")}</AlertTitle>
                    <AlertDescription>{t("automaticReleaseBody")}</AlertDescription>
                  </Alert>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="grid gap-5">
                  <Heading eyebrow={t("step", { current: 4 })} title={t("reviewTitle")} body={t("reviewBody")} />
                  <ReviewSection title={t("reviewItemTitle")} editLabel={common("edit")} onEdit={() => goToStep(0)}>
                    <ReviewRow label={t("titleLabel")} value={form.getValues("title")} />
                    <ReviewRow label={t("descriptionLabel")} value={form.getValues("description") || t("notProvided")} />
                    <ReviewRow label={t("agreementLabel")} value={form.getValues("agreement")} />
                    <MediaReview
                      label={t("mediaLabel")}
                      summary={t("filesSelected", { count: files.length })}
                      files={files}
                      previewURLs={previewURLs}
                      previewLabel={(name) => t("previewFile", { name })}
                      onPreview={setPreviewIndex}
                    />
                  </ReviewSection>
                  <ReviewSection title={t("reviewShippingTitle")} editLabel={common("edit")} onEdit={() => goToStep(1)}>
                    <ReviewRow label={t("priceLabel")} value={formatBaht(amount)} money />
                    <ReviewRow label={t("carrierLabel")} value={form.getValues("preferredCarrier")} />
                  </ReviewSection>
                  <ReviewSection title={t("reviewProtectionTitle")} editLabel={common("edit")} onEdit={() => goToStep(2)}>
                    <ReviewRow label={t("paymentProtectionLabel")} value={t("heldBody")} />
                    <ReviewRow label={t("releaseProtectionLabel")} value={t("releaseBody")} />
                  </ReviewSection>
                  <MoneyFee
                    rows={[
                      { id: "buyer", label: t("buyerPays"), value: formatBaht(amount) },
                      { id: "fee", label: t("sellerFee", { percent: formatFeePercent(feeBPS) }), value: formatBaht(pricing.feeSatang) },
                    ]}
                    total={{ id: "net", label: t("youReceive"), value: formatBaht(pricing.netSatang) }}
                  />
                  <label className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-ring",
                    confirmed && "border-primary bg-accent",
                    form.formState.errors.confirmed && "border-error-border bg-error-bg/50",
                  )}>
                    <input
                      type="checkbox"
                      className="mt-0.5 size-[18px] shrink-0 accent-primary"
                      aria-describedby={form.formState.errors.confirmed ? "deal-confirmation-error" : undefined}
                      {...form.register("confirmed")}
                    />
                    <span className="grid gap-1">
                      <strong>{t("confirmationTitle")}</strong>
                      <span className="text-sm text-muted-foreground">{t("confirmationBody")}</span>
                    </span>
                  </label>
                  {form.formState.errors.confirmed ? <p id="deal-confirmation-error" className="text-sm text-error">{t("confirmationError")}</p> : null}
                </div>
              ) : null}

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                {step === 0 ? (
                  <Button asChild variant="ghost"><Link href="/deals">{common("cancel")}</Link></Button>
                ) : (
                  <Button type="button" variant="ghost" disabled={busy} onClick={() => goToStep(step - 1)}>
                    <ChevronLeftIcon />{common("back")}
                  </Button>
                )}
                {step < 3 ? (
                  <Button type="button" onClick={() => void next()}>{common("continue")}<ChevronRightIcon /></Button>
                ) : (
                  <Button type="submit" loading={busy} disabled={!confirmed || busy}>{t("createCta")}</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <MediaPreviewDialog
        files={files}
        previewURLs={previewURLs}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        copy={{
          title: t("mediaDialogTitle"),
          summary: t("filesSelected", { count: files.length }),
          close: t("closeMediaPreview"),
          previous: t("previousMedia"),
          next: t("nextMedia"),
          position: (current, total) => t("mediaPosition", { current, total }),
        }}
      />
    </AppLayout>
  );
}

/** Object URLs for local previews, revoked whenever the selection changes. */
function useFilePreviewURLs(files: SelectedFile[]) {
  const [urls, setURLs] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const created: Record<string, string> = {};
    for (const { id, file } of files) created[id] = URL.createObjectURL(file);
    setURLs(created);
    return () => { for (const url of Object.values(created)) URL.revokeObjectURL(url); };
  }, [files]);

  return urls;
}

function ShareResult({ code, amountSatang, feeBPS }: { code: string; amountSatang: number; feeBPS: number }) {
  return <AppLayout><DealShareCard code={code} amountSatang={amountSatang} feeBPS={feeBPS} /></AppLayout>;
}

function Heading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div><p className={cn(note, "text-xs font-bold uppercase tracking-wider")}>{eyebrow}</p><h2 className="mt-2 text-2xl font-bold">{title}</h2><p className={cn(note, "mt-1")}>{body}</p></div>;
}

function ReviewSection({
  title,
  editLabel,
  onEdit,
  children,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardContent className="p-4 sm:p-[18px]">
        <div className="mb-3 flex items-center justify-between gap-4">
          <strong>{title}</strong>
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>{editLabel}</Button>
        </div>
        <div className="grid gap-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function ReviewRow({ label, value, money = false }: { label: string; value: React.ReactNode; money?: boolean }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] sm:gap-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className={cn("min-w-0 whitespace-pre-wrap break-words text-sm sm:text-right", money && "font-mono text-base")}>{value}</strong>
    </div>
  );
}

/** Review row: a thumbnail per selected file, each opening the preview at that file. */
function MediaReview({
  label,
  summary,
  files,
  previewURLs,
  previewLabel,
  onPreview,
}: {
  label: string;
  summary: string;
  files: SelectedFile[];
  previewURLs: Record<string, string>;
  previewLabel: (name: string) => string;
  onPreview: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        {files.slice(0, MAX_REVIEW_THUMBS).map(({ id, file }, index) => (
          <MediaThumb
            key={id}
            url={previewURLs[id]}
            name={file.name}
            isImage={file.type.startsWith("image/")}
            label={previewLabel(file.name)}
            className="size-9 rounded-lg border"
            onOpen={() => onPreview(index)}
          />
        ))}
        <strong className="text-sm">{summary}</strong>
      </div>
    </div>
  );
}

const MAX_REVIEW_THUMBS = 4;

function MediaThumb({
  url,
  name,
  label,
  className,
  isImage = true,
  onOpen,
}: {
  url?: string;
  name: string;
  label: string;
  className?: string;
  isImage?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onOpen}
      className={cn(
        "grid shrink-0 cursor-pointer place-items-center overflow-hidden bg-muted text-muted-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {isImage && url ? (
        // Blob URLs are local previews and are never sent to the image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <FileTextIcon className="size-4" aria-hidden="true" />
      )}
      <span className="sr-only">{name}</span>
    </button>
  );
}

function MediaPreviewDialog({
  files,
  previewURLs,
  index,
  onIndexChange,
  copy,
}: {
  files: SelectedFile[];
  previewURLs: Record<string, string>;
  index: number | null;
  onIndexChange: (index: number | null) => void;
  copy: {
    title: string;
    summary: string;
    close: string;
    previous: string;
    next: string;
    position: (current: number, total: number) => string;
  };
}) {
  const current = index !== null && index < files.length ? index : null;
  const selected = current !== null ? files[current] : null;

  function move(direction: -1 | 1) {
    if (current === null) return;
    onIndexChange((current + direction + files.length) % files.length);
  }

  return (
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) onIndexChange(null); }}>
      {selected && current !== null ? (
        <DialogContent
          closeLabel={copy.close}
          className="w-[min(760px,calc(100%-1rem))] max-w-none grid-cols-[minmax(0,1fr)] gap-0 overflow-hidden p-0"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") move(-1);
            if (event.key === "ArrowRight") move(1);
          }}
        >
          <DialogTitle className="sr-only">{copy.title}</DialogTitle>
          <DialogDescription className="sr-only">{copy.summary}</DialogDescription>
          <MediaSlide selected={selected} url={previewURLs[selected.id]} />
          <div className="flex min-w-0 items-center justify-between gap-3 border-t p-3 sm:p-4">
            <Button type="button" variant="outline" size="sm" onClick={() => move(-1)} disabled={files.length < 2} aria-label={copy.previous}>
              <ChevronLeftIcon /> <span className="hidden sm:inline">{copy.previous}</span>
            </Button>
            <div className="min-w-0 text-center">
              <p className="truncate text-sm font-semibold">{selected.file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(selected.file.size)} · {copy.position(current + 1, files.length)}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => move(1)} disabled={files.length < 2} aria-label={copy.next}>
              <span className="hidden sm:inline">{copy.next}</span> <ChevronRightIcon />
            </Button>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function MediaSlide({ selected, url }: { selected: SelectedFile; url?: string }) {
  const isImage = selected.file.type.startsWith("image/");

  return (
    // Flex + min-w-0, not grid: a grid track sizes to the image's intrinsic width and widens the dialog.
    // The stage hugs the media (min height only) so a landscape image gets no dark bands above and below.
    <div className="flex min-h-[340px] w-full min-w-0 items-center justify-center overflow-hidden bg-foreground/95 p-4 sm:p-7">
      {url ? (
        isImage ? (
          // Blob URLs are local previews and are never sent to the image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={selected.file.name} className="max-h-[62dvh] w-auto max-w-full rounded-md object-contain shadow-md" />
        ) : (
          <iframe src={url} title={selected.file.name} className="h-[62dvh] w-full rounded-md bg-card" />
        )
      ) : (
        <FileTextIcon className="size-12 text-background/70" aria-hidden="true" />
      )}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
