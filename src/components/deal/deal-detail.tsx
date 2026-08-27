"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
	Button,
  ConfirmationDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
	EscrowTimeline,
  Skeleton,
} from "@/components/ds";
import { DealEdgePanel, DealPanel } from "@/components/deal/deal-panels";
import { DisputeView, OpenDisputeDialog } from "@/components/deal/dispute-panel";
import { DealShareCard } from "@/components/deal/deal-share-card";
import { DealAccept } from "@/components/deal/deal-accept";
import { useDeal, useDealPolicy, useInvitation } from "@/hooks/use-deals";
import {
  useOmiseCheckout,
  OmiseCheckoutCancelled,
  type PaymentMethod,
} from "@/hooks/use-omise-checkout";
import { ApiError } from "@/lib/api/client";
import { acceptItem, confirmReceipt, fundDeal, refundDeal, shipDeal } from "@/lib/api/deals";
import { uploadPrivateFiles } from "@/lib/api/uploads";
import {
  canRefund,
  dealStage,
  fundsAreHeld,
  isActive,
  isEdgeStatus,
  refundInFlight,
  stageTone,
  type Deal,
  type DealStage,
} from "@/lib/domain/deal";
import { feeBreakdown, formatBaht } from "@/lib/money";
import { cn } from "@/lib/ds-utils";
import { formatDateTime } from "@/lib/format";
import { card, code as codeClass, money, note } from "@/lib/ui";

type DialogKind = "receipt" | "accept" | "refund" | null;

const PAY_RETURN_KEY = "safedeal:pay:return";

/**
 * The centrepiece (DESIGN-BRIEFS.md brief 6). One layout, role-aware and state-driven:
 * the header and money never move, and exactly one contextual panel below them tells the
 * viewer what — if anything — is theirs to do.
 *
 * The backend remains authoritative for every action; successful mutations refetch the
 * shared deal before presenting the new state.
 */
export function DealDetail({ code }: { code: string }) {
  const t = useTranslations("deal");
  const tToast = useTranslations("deal.toast");
  const tCommon = useTranslations("common");
  const tDialog = useTranslations("deal.dialog");
  const tPolicy = useTranslations("dealPolicy");

  const query = useDeal(code);
  const policy = useDealPolicy();
  const feeBPS = policy.data?.sellerFeeBPS ?? null;
  // The deal endpoint is participant-only. When it refuses the viewer (an invited buyer
  // who hasn't accepted yet), fall back to the invitation preview and let them join here.
  const notParticipant =
    query.isError && query.error instanceof ApiError && [403, 404].includes(query.error.status);
  const invitation = useInvitation(code, notParticipant);
  const [preparingShipment, setPreparingShipment] = React.useState(false);
  const [dialog, setDialog] = React.useState<DialogKind>(null);
  const [disputeOpen, setDisputeOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [qr, setQr] = React.useState<string | null>(null);
  const { openCardCheckout, createPromptPaySource, available: payAvailable } = useOmiseCheckout();

  // While the PromptPay QR is up, poll for the webhook-confirmed funding (SSE also refetches);
  // close the dialog once the deal leaves ready_for_payment.
  React.useEffect(() => {
    if (!qr) return;
    const id = window.setInterval(() => void query.refetch(), 3000);
    return () => window.clearInterval(id);
  }, [qr, query.refetch]);
  React.useEffect(() => {
    if (qr && query.data && query.data.status !== "ready_for_payment") {
      setQr(null);
      toast.success(tToast("updatedTitle"), { description: tToast("updatedBody") });
    }
  }, [qr, query.data, tToast]);

  if (query.isPending) {
    return (
      <main className="mx-auto w-[min(760px,calc(100%-32px))] py-8">
        <Skeleton className="h-64 w-full rounded-xl" />
      </main>
    );
  }

  if (query.isError || !query.data) {
    // Invited-but-not-joined buyer: show the review-and-accept surface once the invitation
    // (and the fee policy it needs) have loaded. Anything else falls through to not-found.
    if (notParticipant && invitation.data?.status === "waiting_buyer_accept") {
      if (policy.isPending) {
        return (
          <main className="mx-auto w-[min(760px,calc(100%-32px))] py-8">
            <Skeleton className="h-64 w-full rounded-xl" />
          </main>
        );
      }
      if (policy.isError || feeBPS === null) {
        return (
          <main className="mx-auto w-[min(760px,calc(100%-32px))] py-8">
            <Alert variant="error">
              <AlertTitle>{tPolicy("errorTitle")}</AlertTitle>
              <AlertDescription>{tPolicy("errorBody")}</AlertDescription>
              <Button type="button" variant="outline" className="mt-4" onClick={() => void policy.refetch()}>
                {tPolicy("retry")}
              </Button>
            </Alert>
          </main>
        );
      }
      return <DealAccept deal={invitation.data} feeBPS={feeBPS} />;
    }
    if (notParticipant && invitation.isPending) {
      return (
        <main className="mx-auto w-[min(760px,calc(100%-32px))] py-8">
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      );
    }
    return (
      <main className="mx-auto w-[min(760px,calc(100%-32px))] py-8">
        <Alert variant="error">
          <AlertTitle>{t("notFound")}</AlertTitle>
          <AlertDescription>{t("notFoundBody", { code })}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (policy.isPending) {
    return (
      <main className="mx-auto w-[min(760px,calc(100%-32px))] py-8">
        <Skeleton className="h-64 w-full rounded-xl" />
      </main>
    );
  }

  if (policy.isError || feeBPS === null) {
    return (
      <main className="mx-auto w-[min(760px,calc(100%-32px))] py-8">
        <Alert variant="error">
          <AlertTitle>{tPolicy("errorTitle")}</AlertTitle>
          <AlertDescription>{tPolicy("errorBody")}</AlertDescription>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void policy.refetch()}>
            {tPolicy("retry")}
          </Button>
        </Alert>
      </main>
    );
  }

  const deal: Deal = query.data;
  if (deal.status === "waiting_buyer_accept" && deal.role === "seller") {
    return <WaitingDealShare deal={deal} feeBPS={feeBPS} />;
  }
  const role = deal.role;
  const edge = isEdgeStatus(deal.status) ? deal.status : null;
  const derivedStage = dealStage(deal);
  // `shipping` is the seller's local sub-step of `funded` — the shipment form is open.
  const stage: DealStage | null =
    preparingShipment && derivedStage === "funded" ? "shipping" : derivedStage;

  const heldVisible = !edge && fundsAreHeld(deal);
  const releaseAuthorized = stage === "release" || stage === "transfer";

  async function startPayment(method: PaymentMethod) {
    setPending(true);
    try {
      // PromptPay is headless — no popup, straight to our in-app QR. Card opens the Omise
      // hosted popup for the card fields + 3DS.
      const nonce =
        method === "promptpay"
          ? await createPromptPaySource(deal.amountSatang)
          : await openCardCheckout({ amountSatang: deal.amountSatang, title: deal.title });
      const { payment } = await fundDeal(code, { method, token: nonce });
      // A PromptPay charge is scanned in-app: it comes back pending with a QR image while the
      // deal stays open — confirmed server-side by webhook/reconciler, and the deal's SSE flips
      // it to funded, which closes the dialog. Omise also sets `authorizeUri` (a hosted QR page)
      // on that same pending charge, so the QR branch MUST be checked first — otherwise PromptPay
      // wrongly takes the card path below and full-redirects away from the app.
      if (payment?.state === "pending" && payment.qrImageUri) {
        setQr(payment.qrImageUri);
        return;
      }
      // Card 3DS (and any Omise-hosted card challenge) is a full redirect; bounce back to /pay/return.
      if (payment?.authorizeUri) {
        sessionStorage.setItem(PAY_RETURN_KEY, code);
        window.location.href = payment.authorizeUri;
        return;
      }
      await query.refetch();
      toast.success(tToast("updatedTitle"), { description: tToast("updatedBody") });
    } catch (e) {
      if (e instanceof OmiseCheckoutCancelled) return; // buyer closed the popup — not an error
      toast.error(tToast("failedTitle"), { description: tToast("failedBody") });
    } finally {
      setPending(false);
    }
  }

  const actions = {
    onPay: (method: PaymentMethod) => void startPayment(method),
    payDisabledReason: payAvailable ? undefined : t("pay.unavailable"),
    onPrepareShipment: () => setPreparingShipment(true),
	onConfirmShipment: async (shipment: { carrier: string; trackingNumber: string; files: File[] }) => {
	  setPending(true);
	  try { const proofs = await uploadPrivateFiles(shipment.files, "shipment", code); await shipDeal(code, { carrier: shipment.carrier, trackingNumber: shipment.trackingNumber, proofs }); setPreparingShipment(false); await query.refetch(); toast.success(tToast("shipmentTitle"), { description: tToast("shipmentBody") }); }
	  catch { toast.error(tToast("failedTitle"), { description: tToast("failedBody") }); }
	  finally { setPending(false); }
	},
	onConfirmReceipt: () => setDialog("receipt"),
    onAccept: () => setDialog("accept"),
    onReportProblem: () => setDisputeOpen(true),
	onRenew: () => toast.info(tToast("laterTitle"), { description: tToast("laterBody") }),
  };

  async function confirmDialog() {
	setPending(true);
	try {
	  if (dialog === "receipt") await confirmReceipt(code);
	  if (dialog === "accept") await acceptItem(code);
	  if (dialog === "refund") await refundDeal(code);
	  await query.refetch();
	  const toastKey = dialog === "accept" ? "release" : dialog === "refund" ? "refund" : "updated";
	  toast.success(tToast(`${toastKey}Title`), { description: tToast(`${toastKey}Body`) });
	  setDialog(null);
	} catch { toast.error(tToast("failedTitle"), { description: tToast("failedBody") }); }
	finally { setPending(false); }
  }

  return (
    <>
      <main className="mx-auto w-[min(1160px,calc(100%-40px))] pt-6 pb-18">
	    <Button asChild variant="ghost" size="sm" className="mb-4"><Link href="/deals"><ChevronLeftIcon />{tCommon("back")}</Link></Button>
      <header className="mb-5 flex flex-col gap-2">
        <p className="text-[13px] font-bold text-primary">{t("kicker")}</p>
        <h1 className="text-[clamp(28px,5vw,34px)] font-bold leading-[1.1] tracking-[-0.03em]">
          {deal.title}
        </h1>
        <p className={cn(note, "max-w-[620px] text-[15px]")}>{t("subtitle")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className={codeClass}>{deal.code}</span>
          {edge ? (
            <Badge variant={edge === "in_dispute" ? "error" : "terminal"}>
              {t(`edge.${edge === "in_dispute" ? "disputed" : edge}.badge`)}
            </Badge>
          ) : stage ? (
            <Badge variant={stageTone(stage)}>{t(`stages.${stage}`)}</Badge>
          ) : null}
        </div>
      </header>

      {deal.transfer === "failed" ? (
        <div className="mb-4 rounded-xl border border-warning-border bg-warning-bg px-4 py-3.5">
          <strong className="text-sm">{t("payoutFailed.title")}</strong>
          <p className={cn(note, "mt-0.5 text-xs")}>{t("payoutFailed.body")}</p>
        </div>
      ) : null}

      {role === "buyer" &&
      deal.status === "ready_for_payment" &&
      deal.events?.[deal.events.length - 1]?.type === "payment_failed" ? (
        <div className="mb-4 rounded-xl border border-warning-border bg-warning-bg px-4 py-3.5">
          <strong className="text-sm">{t("paymentFailed.title")}</strong>
          <p className={cn(note, "mt-0.5 text-xs")}>{t("paymentFailed.body")}</p>
        </div>
      ) : null}

      {refundInFlight(deal) ? (
        <div className="mb-4 rounded-xl border border-warning-border bg-warning-bg px-4 py-3.5">
          <strong className="text-sm">{t(`refundState.${deal.refund}.title`)}</strong>
          <p className={cn(note, "mt-0.5 text-xs")}>{t(`refundState.${deal.refund}.body`)}</p>
        </div>
      ) : null}

      {heldVisible ? (
        <div className="sticky top-3 z-[4] mb-4 grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-info-border bg-info-bg/90 px-4 py-3.5 shadow-sm backdrop-blur-md">
          <div>
            <strong>{releaseAuthorized ? t("held.releasedLabel") : t("held.label")}</strong>
            <p className={cn(note, "mt-0.5 text-xs")}>
              {releaseAuthorized ? t("held.releasedBody") : t("held.body")}
            </p>
          </div>
          <div className={cn(money, "text-[22px] text-info")}>
            {formatBaht(deal.amountSatang)}
          </div>
        </div>
      ) : null}

      {role === "seller" && canRefund(deal) ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
          <div className="min-w-0">
            <strong className="text-sm">{t("refund.title")}</strong>
            <p className={cn(note, "mt-0.5 text-xs")}>{t("refund.body")}</p>
          </div>
          <Button variant="outline" onClick={() => setDialog("refund")}>{t("refund.cta")}</Button>
        </div>
      ) : null}

      <div className="grid items-start gap-[18px] min-[980px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <article className={cn(card, "p-[clamp(20px,5vw,34px)]")}>
		  {deal.mediaUrls?.[0] ? <img src={deal.mediaUrls[0]} alt="" className="mb-5 h-[210px] w-full rounded-xl object-cover" /> : null}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4.5">
            <div className="min-w-0">
              <Badge variant="info">
                {t("viewingAs", { role: role === "buyer" ? t("buyer") : t("seller") })}
              </Badge>
              <h2 className="mt-2.5 text-[22px] font-bold tracking-[-0.02em]">{deal.title}</h2>
              <p className={cn(note, "mt-1")}>
                {deal.code} ·{" "}
                {role === "buyer"
                  ? t("buyingFrom", { name: deal.counterparty.name })
                  : t("sellingTo", { name: deal.counterparty.name })}
              </p>
            </div>
            <div className="text-right">
              <span className={note}>{t("itemAmount")}</span>
              <div className={cn(money, "mt-1 text-[24px]")}>{formatBaht(deal.amountSatang)}</div>
            </div>
          </div>

          {deal.status === "in_dispute" ? (
            <div className="mt-5 border-t pt-5">
              <DisputeView deal={deal} />
            </div>
          ) : edge ? (
            <DealEdgePanel status={edge} onRenew={actions.onRenew} />
          ) : stage ? (
            <DealPanel stage={stage} deal={deal} role={role} feeBPS={feeBPS} actions={actions} pending={pending} />
		  ) : null}
        </article>

        <DealHistory deal={deal} />
      </div>

      <OpenDisputeDialog deal={deal} open={disputeOpen} onOpenChange={setDisputeOpen} />

      <ConfirmationDialog
        open={dialog !== null}
		title={dialog === "accept" ? tDialog("acceptTitle") : dialog === "refund" ? tDialog("refundTitle") : tDialog("receiptTitle")}
        consequence={
		  dialog === "accept"
            ? tDialog("acceptConsequence", {
                amount: formatBaht(feeBreakdown(deal.amountSatang, feeBPS).netSatang),
                name: deal.counterparty.name,
              })
            : dialog === "refund"
            ? tDialog("refundConsequence", {
                amount: formatBaht(deal.amountSatang),
                name: deal.counterparty.name,
              })
			: tDialog("receiptConsequence")
        }
        cancelLabel={tCommon("cancel")}
        closeLabel={tCommon("close")}
		confirmLabel={dialog === "accept" ? tDialog("acceptConfirm") : dialog === "refund" ? tDialog("refundConfirm") : tDialog("receiptConfirm")}
        onCancel={() => setDialog(null)}
        onConfirm={confirmDialog}
      />

      {/* While the charge is pending the buyer must stay put: the QR is live and the deal
          flips to funded only when the webhook/reconciler confirms. Lock the dialog — no
          corner close, no outside-click or Esc dismiss — so it can't be lost by a stray
          click; the explicit button below is the one deliberate way out. */}
      <Dialog open={qr !== null} onOpenChange={(open) => { if (!open) setQr(null); }}>
        <DialogContent
          className="max-w-[360px] text-center"
          showCloseButton={false}
          closeLabel={tCommon("close")}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle>{tDialog("qrTitle")}</DialogTitle>
          <DialogDescription>{tDialog("qrBody")}</DialogDescription>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- Omise-hosted QR image
            <img src={qr} alt="" className="mx-auto my-4 h-56 w-56 object-contain" />
          ) : null}
          <div className="rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-xs font-medium">
            {tDialog("qrStay")}
          </div>
          <div className={cn(note, "mt-1 flex items-center justify-center gap-2 text-xs")}>
            <span
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
            />
            {tDialog("qrWaiting")}
          </div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setQr(null)}>
            {tDialog("qrCancel")}
          </Button>
        </DialogContent>
      </Dialog>
      </main>
    </>
  );
}

/** The deal's full event history — the deal room's right-hand column, collapsible. */
function DealHistory({ deal }: { deal: Deal }) {
  const t = useTranslations("deal");
  const locale = useLocale();
  const [open, setOpen] = React.useState(true);
  const events = deal.events ?? [];
  // Past events are settled facts (done). The single "current" node is the stage the deal is
  // actually waiting on — not the last completed event, which reads as a pending action the
  // participant already finished (e.g. "Buyer accepted terms" while really awaiting payment).
  const currentStage =
    isActive(deal.status) && !isEdgeStatus(deal.status) ? dealStage(deal) : null;
  const steps = [
    ...events.map((event, index) => ({
      id: `${event.type}-${index}`,
      state: "done" as const,
      // A `completed` by the system is the inspection-window auto-release, not the buyer accepting.
      title:
        event.type === "completed" && event.actorType === "system"
          ? t("timelineEvents.auto_released")
          : t(`timelineEvents.${event.type}`),
      detail: formatDateTime(event.createdAt, locale) ?? "—",
    })),
    ...(currentStage
      ? [
          {
            id: `stage-${currentStage}`,
            state: "current" as const,
            title: t(`stages.${currentStage}`),
            detail: t("history.inProgress"),
          },
        ]
      : []),
  ];

  return (
    <section className={cn(card, "p-5")}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold">{t("history.title")}</h3>
          <p className={cn(note, "mt-0.5")}>{t("history.subtitle")}</p>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setOpen((value) => !value)}>
          {open ? t("history.hide") : t("history.show")}
        </Button>
      </div>
      {open ? (
        steps.length ? (
          <EscrowTimeline label={t("timelineLabel")} steps={steps} />
        ) : (
          <p className={note}>{t("history.empty")}</p>
        )
      ) : null}
    </section>
  );
}

function WaitingDealShare({ deal, feeBPS }: { deal: Deal; feeBPS: number }) {
  return (
    <DealShareCard
      code={deal.code}
      amountSatang={deal.amountSatang}
      feeBPS={feeBPS}
    />
  );
}
