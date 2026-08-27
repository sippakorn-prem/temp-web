"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Badge,
  Button,
	EvidenceUpload,
  FormField,
  MoneyFee,
	ShipmentTracking,
  StatusCard,
} from "@/components/ds";
import {
  isEdgeStatus,
  type Deal,
  type DealRole,
  type DealStage,
  type EdgeStatus,
} from "@/lib/domain/deal";
import { feeBreakdown, formatBaht } from "@/lib/money";
import { cn } from "@/lib/ds-utils";
import { formatDateTime } from "@/lib/format";
import { note } from "@/lib/ui";

/** Everything a panel can do. The page owns the actual calls; panels just fire them. */
export interface DealActions {
  onPay: (method: "card" | "promptpay") => void;
  /** Set when payment cannot start (e.g. the payment provider isn't configured). */
  payDisabledReason?: string;
  onPrepareShipment: () => void;
	onConfirmShipment: (shipment: { carrier: string; trackingNumber: string; files: File[] }) => void;
	onConfirmReceipt: () => void;
  onAccept: () => void;
  onReportProblem: () => void;
  onRenew: () => void;
}

export interface DealPanelProps {
  deal: Deal;
  role: DealRole;
  feeBPS: number;
  actions: DealActions;
  /** Set while a transition is in flight. */
  pending?: boolean;
}

type PanelTone = "action" | "held" | "neutral" | "complete" | "problem" | "terminal";

const PANEL_TONE: Record<PanelTone, string> = {
  // The percentages match the prototype's color-mix over the card surface.
  action: "border-warning-border bg-warning-bg/55",
  held: "border-info-border bg-info-bg/55",
  neutral: "border-border bg-card",
  complete: "border-success-border bg-success-bg/55",
  problem: "border-error-border bg-error-bg/55",
  terminal: "border-terminal-border bg-terminal-bg",
};

/** The shared frame every stage panel sits in. */
function Panel({
  tone,
  badge,
  badgeTone,
  title,
  children,
}: {
  tone: PanelTone;
  badge?: string;
  badgeTone?: React.ComponentProps<typeof Badge>["variant"];
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("mt-5 rounded-xl border p-5", PANEL_TONE[tone])}>
      {badge ? <Badge variant={badgeTone}>{badge}</Badge> : null}
      {title ? <h2 className="mt-3 text-[19px] font-semibold">{title}</h2> : null}
      {children}
    </div>
  );
}

const CARRIERS = ["Kerry Express", "Thailand Post EMS"];

/**
 * One panel per (stage × role). The map is exhaustive by type, so adding a stage without
 * designing both sides of it fails to compile rather than rendering nothing.
 */
const PANELS: Record<DealStage, Record<DealRole, React.ComponentType<DealPanelProps>>> = {
  payment: { buyer: PayBuyer, seller: PaySeller },
  funded: { buyer: FundedBuyer, seller: FundedSeller },
  shipping: { buyer: FundedBuyer, seller: ShippingSeller },
  delivery: { buyer: DeliveryBuyer, seller: DeliverySeller },
  inspection: { buyer: InspectionBuyer, seller: InspectionSeller },
  release: { buyer: ReleaseBuyer, seller: ReleaseSeller },
  transfer: { buyer: TransferBuyer, seller: TransferSeller },
  complete: { buyer: CompletePanel, seller: CompletePanel },
};

export function DealPanel({ stage, ...props }: DealPanelProps & { stage: DealStage }) {
  const Component = PANELS[stage][props.role];
  return <Component {...props} />;
}

/* ---------------------------------- payment --------------------------------- */

function PayBuyer({ deal, actions, pending }: DealPanelProps) {
  const t = useTranslations("deal.pay");
  const tBadge = useTranslations("deal.badge");
  const amount = formatBaht(deal.amountSatang);

  return (
    <Panel tone="action" badge={tBadge("yourAction")} badgeTone="warning" title={t("title", { amount })}>
      <p className={note}>{t("body")}</p>
      <div className="mt-3.5">
        <MoneyFee
          rows={[
            { id: "item-price", label: t("itemPrice"), value: amount },
            { id: "buyer-fee", label: t("buyerFee"), value: formatBaht(0) },
          ]}
          total={{ id: "total", label: t("total"), value: amount }}
        />
      </div>
      <div className="mt-5 grid gap-2.5">
        <Button
          className="w-full"
          onClick={() => actions.onPay("promptpay")}
          disabled={Boolean(actions.payDisabledReason) || pending}
          title={actions.payDisabledReason}
        >
          {t("ctaPromptPay")}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => actions.onPay("card")}
          disabled={Boolean(actions.payDisabledReason) || pending}
          title={actions.payDisabledReason}
        >
          {t("ctaCard")}
        </Button>
      </div>
      {actions.payDisabledReason ? (
        <p className={cn(note, "mt-2 text-center text-xs")}>{actions.payDisabledReason}</p>
      ) : null}
    </Panel>
  );
}

function PaySeller() {
  const t = useTranslations("deal.pay");
  const tBadge = useTranslations("deal.badge");
  return (
    <Panel tone="neutral" badge={tBadge("buyerAction")} badgeTone="warning" title={t("waitingTitle")}>
      <p className={note}>{t("waitingBody")}</p>
    </Panel>
  );
}

/* ----------------------------------- funded --------------------------------- */

function FundedBuyer({ deal }: DealPanelProps) {
  const t = useTranslations("deal.ship");
  const tBadge = useTranslations("deal.badge");
  return (
    <Panel
      tone="held"
      badge={tBadge("held")}
      badgeTone="info"
      title={t("waitingTitle", { name: deal.counterparty.name })}
    >
      <p className={note}>
        {t("waitingBody", { amount: formatBaht(deal.amountSatang) })}
      </p>
    </Panel>
  );
}

function FundedSeller({ deal, actions }: DealPanelProps) {
  const t = useTranslations("deal.ship");
  const tBadge = useTranslations("deal.badge");
  const locale = useLocale();
  return (
    <Panel tone="action" badge={tBadge("yourAction")} badgeTone="warning" title={t("actionTitle")}>
      <p className={note}>
        {t("actionBody", {
          amount: formatBaht(deal.amountSatang),
          deadline: deal.shipBy ? (formatDateTime(deal.shipBy, locale) ?? "—") : "—",
        })}
      </p>
      <div className="mt-3.5">
        <Button onClick={actions.onPrepareShipment}>{t("prepareCta")}</Button>
      </div>
    </Panel>
  );
}

/* ---------------------------------- shipping -------------------------------- */

function ShippingSeller({ deal, actions, pending }: DealPanelProps) {
  const t = useTranslations("deal.ship");
  const tBadge = useTranslations("deal.badge");
  const [carrier, setCarrier] = React.useState(deal.shipment?.carrier ?? CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = React.useState(deal.shipment?.trackingNumber ?? "");
  const [error, setError] = React.useState("");
	const [files, setFiles] = React.useState<File[]>([]);

  function confirm() {
    if (!trackingNumber.trim()) {
      setError(t("trackingRequired"));
      return;
    }
    setError("");
    actions.onConfirmShipment({ carrier, trackingNumber: trackingNumber.trim(), files });
  }

  return (
    <Panel tone="action" badge={tBadge("yourAction")} badgeTone="warning" title={t("detailsTitle")}>
      <div className="mt-4 grid gap-4.5">
        <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
          <div className="grid gap-2">
            <label htmlFor="carrier" className="text-sm font-medium">
              {t("carrierLabel")}
            </label>
            <select
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {CARRIERS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <FormField
            label={t("trackingLabel")}
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            error={error}
          />
        </div>

        <EvidenceUpload inputLabel={t("uploadTitle")} hint={t("uploadHint")} constraints={t("uploadConstraints")} accept="image/jpeg,image/png,application/pdf" multiple files={files.map((file, index) => ({ id: `${file.name}-${index}`, name: file.name, size: `${Math.ceil(file.size / 1024)} KB` }))} removeLabel={() => t("removeFile")} onFilesSelected={(selected) => setFiles((current) => [...current, ...selected].slice(0, 3))} onRemove={(selected) => setFiles((current) => current.filter((file, index) => `${file.name}-${index}` !== selected.id))} />

        <Button onClick={confirm} loading={pending}>
          {t("confirmCta")}
        </Button>
      </div>
    </Panel>
  );
}

/* ---------------------------------- delivery -------------------------------- */

function DeliveryBuyer({ deal, actions }: DealPanelProps) {
  const t = useTranslations("deal.track");
  const tBadge = useTranslations("deal.badge");
  return (
    <Panel tone="held" badge={tBadge("inTransit")} badgeTone="info" title={t("title")}>
      <div className="mt-3.5">
        <ShipmentTracking events={[{ id: "shipped", title: t("inTransitEvent"), detail: deal.shipment?.latestUpdate, current: true }]} facts={[{ id: "carrier", label: t("carrier"), value: deal.shipment?.carrier ?? "—" }, { id: "tracking", label: t("trackingNumber"), value: deal.shipment?.trackingNumber ?? "—" }, { id: "inspection", label: t("inspection"), value: t("inspectionBegins") }]} />
      </div>
	  <Button className="mt-5" onClick={actions.onConfirmReceipt}>{t("receivedCta")}</Button>
    </Panel>
  );
}

function DeliverySeller() {
  const t = useTranslations("deal.track");
  const tBadge = useTranslations("deal.badge");
  return (
    <Panel
      tone="neutral"
      badge={tBadge("buyerWaiting")}
      badgeTone="info"
      title={t("sellerTitle")}
    >
      <p className={note}>{t("sellerBody")}</p>
    </Panel>
  );
}

/* --------------------------------- inspection ------------------------------- */

function InspectionBuyer({ deal, actions }: DealPanelProps) {
  const t = useTranslations("deal.inspect");
  const tBadge = useTranslations("deal.badge");
  const locale = useLocale();
  return (
    <Panel tone="action" badge={tBadge("yourAction")} badgeTone="warning" title={t("title")}>
      <p className={note}>{t("body")}</p>
      <div className="mt-3.5">
        <MoneyFee
          rows={[
            { id: "agreement", label: t("agreement"), value: deal.terms.agreement },
            {
              id: "deadline",
              label: t("deadline"),
              value: deal.autoCompleteAt
                ? (formatDateTime(deal.autoCompleteAt, locale) ?? "—")
                : "—",
            },
          ]}
        />
      </div>
      <div className="mt-4.5 flex flex-wrap gap-3">
        <Button onClick={actions.onAccept}>{t("acceptCta")}</Button>
        <Button variant="outline" onClick={actions.onReportProblem}>
          {t("problemCta")}
        </Button>
      </div>
    </Panel>
  );
}

function InspectionSeller({ deal }: DealPanelProps) {
  const t = useTranslations("deal.inspect");
  const tBadge = useTranslations("deal.badge");
  return (
    <Panel
      tone="held"
      badge={tBadge("buyerInspection")}
      badgeTone="info"
      title={t("sellerTitle", { name: deal.counterparty.name })}
    >
      <p className={note}>{t("sellerBody")}</p>
    </Panel>
  );
}

/* ---------------------------------- release --------------------------------- */

function ReleaseBuyer({ deal, feeBPS }: DealPanelProps) {
  const t = useTranslations("deal.release");
  const tBadge = useTranslations("deal.badge");
  return (
    <Panel
      tone="held"
      badge={tBadge("releaseAuthorized")}
      badgeTone="info"
      title={t("buyerTitle")}
    >
      <p className={note}>
        {t("buyerBody", {
          amount: formatBaht(feeBreakdown(deal.amountSatang, feeBPS).netSatang),
          name: deal.counterparty.name,
        })}
      </p>
    </Panel>
  );
}

function ReleaseSeller({ deal, feeBPS }: DealPanelProps) {
  const t = useTranslations("deal.release");
  const tBadge = useTranslations("deal.badge");
  return (
    <Panel
      tone="held"
      badge={tBadge("releaseAuthorized")}
      badgeTone="info"
      title={t("sellerTitle")}
    >
      <p className={note}>
        {t("sellerBody", {
          name: deal.counterparty.name,
          amount: formatBaht(feeBreakdown(deal.amountSatang, feeBPS).netSatang),
        })}
      </p>
    </Panel>
  );
}

/* ---------------------------------- transfer -------------------------------- */

function TransferBuyer({ deal, feeBPS }: DealPanelProps) {
  const t = useTranslations("deal.transfer");
  const tBadge = useTranslations("deal.badge");
  return (
    <Panel
      tone="held"
      badge={tBadge("transferProcessing")}
      badgeTone="info"
      title={t("buyerTitle")}
    >
      <p className={note}>
        {t("buyerBody", { amount: formatBaht(feeBreakdown(deal.amountSatang, feeBPS).netSatang) })}
      </p>
    </Panel>
  );
}

function TransferSeller({ deal, feeBPS }: DealPanelProps) {
  const t = useTranslations("deal.transfer");
  const tBadge = useTranslations("deal.badge");
  return (
    <Panel
      tone="held"
      badge={tBadge("transferProcessing")}
      badgeTone="info"
      title={t("sellerTitle", { amount: formatBaht(feeBreakdown(deal.amountSatang, feeBPS).netSatang) })}
    >
      <p className={note}>
        {t("sellerBody", { destination: deal.payoutDestination ?? "—" })}
      </p>
    </Panel>
  );
}

/* ---------------------------------- complete -------------------------------- */

// The timeline that used to live here now sits in the deal room's history column, so the
// completed panel is just the release confirmation + the money split.
function CompletePanel({ deal, feeBPS }: DealPanelProps) {
  const t = useTranslations("deal.complete");
  const pricing = feeBreakdown(deal.amountSatang, feeBPS);

  return (
    <div className="mt-5 grid gap-4">
      <StatusCard
        state="complete"
        label={t("badge")}
        title={t("transferredTitle", { amount: formatBaht(pricing.netSatang), name: deal.counterparty.name })}
      >
        {t("releasedBody")}
      </StatusCard>

      <MoneyFee
        rows={[
          { id: "buyer-paid", label: t("buyerPaid"), value: formatBaht(deal.amountSatang) },
          { id: "item-amount", label: t("itemAmount"), value: formatBaht(deal.amountSatang) },
          // Leading minus mirrors the design's "−฿6" fee line.
          { id: "platform-fee", label: t("platformFee"), value: `−${formatBaht(pricing.feeSatang)}` },
        ]}
        total={{ id: "seller-received", label: t("sellerReceived"), value: formatBaht(pricing.netSatang) }}
      />
    </div>
  );
}

/* --------------------------------- edge states ------------------------------ */

export function DealEdgePanel({
  status,
  onRenew,
}: {
  status: EdgeStatus;
  onRenew: () => void;
}) {
  const t = useTranslations("deal.edge");
  const key = status === "in_dispute" ? "disputed" : status;

  return (
    <Panel
      tone={status === "in_dispute" ? "problem" : "terminal"}
      badge={t(`${key}.badge`)}
      badgeTone={status === "in_dispute" ? "error" : "terminal"}
      title={t(`${key}.title`)}
    >
      <p className={note}>{t(`${key}.body`)}</p>
      {status === "expired" ? (
        <div className="mt-4.5">
          <Button onClick={onRenew}>{t("expired.cta")}</Button>
        </div>
      ) : null}
    </Panel>
  );
}

export { isEdgeStatus };
