import { getTranslations } from "next-intl/server";
import { Badge, Button, EscrowTimeline, MoneyFee, ShipmentTracking, StatusCard } from "@/components/ds";
import type { TimelineStep } from "@/components/ds";
import { formatBaht, feeBreakdown, PLATFORM_FEE_BPS } from "@/lib/money";
import { stageTone, type DealStage } from "@/lib/domain/deal";
import { cn } from "@/lib/ds-utils";
import { card, code as codeClass, money, note } from "@/lib/ui";

/**
 * One faithful marketing snapshot of the real deal room ([deal-detail.tsx]) at a given lifecycle
 * state, buyer's view, sized for the "How it works" phone. It assembles the *same* pieces the real
 * page does — header + info held banner + article card + a stage `Panel` (the same DS parts the real
 * [deal-panels.tsx] uses: `Badge`, `MoneyFee`, `ShipmentTracking`, `StatusCard`, `Button`) + the real
 * `EscrowTimeline` — with copy from the real `deal` namespace and the real `PLATFORM_FEE_BPS`, so it is
 * the product, not a replica. It is a presentation-only fixture: hard-coded, no hooks, no backend,
 * never authoritative deal state. Amount is satang; the fee shown is the real platform fee.
 */
const AMOUNT_SATANG = 1_250_000; // ฿12,500 — sample deal, not the fee engine
const DEAL_CODE = "SD-XXXXXX"; // placeholder, never a real deal code
const SELLER = "CameraHub";
const CARRIER = "Kerry Express";
const TRACKING = "TH1234567";

export type FlowState = "pay" | "held" | "shipped" | "check" | "done";

const PANEL_TONE = {
  action: "border-warning-border bg-warning-bg/55",
  held: "border-info-border bg-info-bg/55",
  complete: "border-success-border bg-success-bg/55",
} as const;

export async function DealScreen({ state }: { state: FlowState }) {
  const td = await getTranslations("deal");
  const tc = await getTranslations("landing.card");
  const tf = await getTranslations("landing.flow");
  const title = tc("itemTitle");
  const amount = formatBaht(AMOUNT_SATANG);
  const fee = feeBreakdown(AMOUNT_SATANG, PLATFORM_FEE_BPS);
  const net = formatBaht(fee.netSatang);

  const ev = (k: string): TimelineStep => ({ id: k, state: "done", title: td(`timelineEvents.${k}`) });
  const cur = (stage: DealStage): TimelineStep => ({ id: `stage-${stage}`, state: "current", title: td(`stages.${stage}`), detail: td("history.inProgress") });

  const cfg: Record<FlowState, { stage: DealStage; steps: TimelineStep[]; held: boolean }> = {
    pay: { stage: "payment", steps: [ev("created"), ev("terms_accepted"), cur("payment")], held: false },
    held: { stage: "funded", steps: [ev("terms_accepted"), ev("funded"), cur("funded")], held: true },
    shipped: { stage: "delivery", steps: [ev("funded"), ev("shipped"), cur("delivery")], held: true },
    check: { stage: "inspection", steps: [ev("shipped"), cur("inspection")], held: true },
    done: { stage: "complete", steps: [ev("shipped"), ev("receipt_confirmed"), ev("completed")], held: false },
  };
  const { stage, steps, held } = cfg[state];

  const Panel = ({ tone, badge, badgeTone, title: pt, children }: {
    tone: keyof typeof PANEL_TONE; badge: string; badgeTone: "warning" | "info" | "success"; title: string; children?: React.ReactNode;
  }) => (
    <div className={cn("mt-4 rounded-xl border p-4", PANEL_TONE[tone])}>
      <Badge variant={badgeTone}>{badge}</Badge>
      <h4 className="mt-2.5 text-[15px] font-semibold leading-snug">{pt}</h4>
      {children}
    </div>
  );

  const panel = (() => {
    switch (state) {
      case "pay":
        return (
          <Panel tone="action" badge={td("badge.yourAction")} badgeTone="warning" title={td("pay.title", { amount })}>
            <p className={cn(note, "mt-1.5 text-[11px]")}>{td("pay.body")}</p>
            <div className="mt-3">
              <MoneyFee
                rows={[
                  { id: "item-price", label: td("pay.itemPrice"), value: amount },
                  { id: "buyer-fee", label: td("pay.buyerFee"), value: formatBaht(0) },
                ]}
                total={{ id: "total", label: td("pay.total"), value: amount }}
              />
            </div>
            <div className="mt-3.5 grid gap-2">
              <Button className="w-full" tabIndex={-1}>{td("pay.ctaPromptPay")}</Button>
              <Button variant="outline" className="w-full" tabIndex={-1}>{td("pay.ctaCard")}</Button>
            </div>
          </Panel>
        );
      case "held":
        return (
          <Panel tone="held" badge={td("badge.held")} badgeTone="info" title={td("ship.waitingTitle", { name: SELLER })}>
            <p className={cn(note, "mt-1.5 text-[11px]")}>{td("ship.waitingBody", { amount })}</p>
          </Panel>
        );
      case "shipped":
        return (
          <Panel tone="held" badge={td("badge.inTransit")} badgeTone="info" title={td("track.title")}>
            <div className="mt-3">
              <ShipmentTracking
                events={[{ id: "shipped", title: td("track.inTransitEvent"), current: true }]}
                facts={[
                  { id: "carrier", label: td("track.carrier"), value: CARRIER },
                  { id: "tracking", label: td("track.trackingNumber"), value: TRACKING },
                  { id: "inspection", label: td("track.inspection"), value: td("track.inspectionBegins") },
                ]}
              />
            </div>
            <Button className="mt-4 w-full" tabIndex={-1}>{td("track.receivedCta")}</Button>
          </Panel>
        );
      case "check":
        return (
          <Panel tone="action" badge={td("badge.yourAction")} badgeTone="warning" title={td("inspect.title")}>
            <p className={cn(note, "mt-1.5 text-[11px]")}>{td("inspect.body")}</p>
            <div className="mt-3">
              <MoneyFee
                rows={[
                  { id: "agreement", label: td("inspect.agreement"), value: tf("termsSample") },
                  { id: "deadline", label: td("inspect.deadline"), value: tf("deadlineSample") },
                ]}
              />
            </div>
            <div className="sd-inspect-actions mt-3.5 flex flex-wrap gap-2">
              <Button className="flex-1" tabIndex={-1}>{td("inspect.acceptCta")}</Button>
              <Button variant="outline" tabIndex={-1}>{td("inspect.problemCta")}</Button>
            </div>
          </Panel>
        );
      case "done":
        return (
          <div className="mt-4 grid gap-3">
            <StatusCard state="complete" label={td("complete.title")} title={td("complete.body", { amount: net, name: SELLER })} />
            <MoneyFee
              rows={[
                { id: "buyer-paid", label: td("complete.buyerPaid"), value: amount },
                { id: "item-amount", label: td("complete.itemAmount"), value: amount },
                { id: "platform-fee", label: td("complete.platformFee"), value: `−${formatBaht(fee.feeSatang)}` },
              ]}
              total={{ id: "seller-received", label: td("complete.sellerReceived"), value: net }}
            />
          </div>
        );
    }
  })();

  return (
    <>
      <p className="text-[11px] font-bold text-primary">{td("kicker")}</p>
      <h3 className="mt-0.5 text-[17px] font-bold leading-tight tracking-[-0.02em]">{title}</h3>
      <p className={cn(note, "mt-1 text-[11px]")}>{td("subtitle")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={cn(codeClass, "text-[11px]")}>{DEAL_CODE}</span>
        <Badge variant={stageTone(stage)}>{td(`stages.${stage}`)}</Badge>
      </div>

      {held ? (
        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-info-border bg-info-bg px-3.5 py-3">
          <div className="min-w-0">
            <strong className="text-[12.5px]">{td("held.label")}</strong>
            <p className={cn(note, "mt-0.5 text-[11px]")}>{td("held.body")}</p>
          </div>
          <div className={cn(money, "text-[17px] text-info")}>{amount}</div>
        </div>
      ) : null}

      <article className={cn(card, "mt-3 p-3")}>
        {state === "held" ? (
          // eslint-disable-next-line @next/next/no-img-element -- static marketing media
          <img className="mb-2.5 h-[104px] w-full rounded-lg object-cover" src="/marketing/deal-camera.jpg" alt={tc("mediaAlt")} width={1000} height={750} loading="lazy" decoding="async" />
        ) : null}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5">
          <div className="min-w-0">
            <Badge variant="info">{td("viewingAs", { role: td("buyer") })}</Badge>
            <h4 className="mt-1.5 text-[13.5px] font-bold tracking-[-0.02em]">{title}</h4>
            <p className={cn(note, "mt-0.5 text-[10.5px]")}>{DEAL_CODE} · {td("buyingFrom", { name: SELLER })}</p>
          </div>
          <div className="text-right">
            <span className={cn(note, "text-[10.5px]")}>{td("itemAmount")}</span>
            <div className={cn(money, "mt-0.5 text-[13px]")}>{amount}</div>
          </div>
        </div>
        {panel}
      </article>

      <section className={cn(card, "mt-3 p-3")}>
        <h5 className="text-[12.5px] font-bold">{td("history.title")}</h5>
        <div className="mt-2.5"><EscrowTimeline label={td("timelineLabel")} steps={steps} /></div>
      </section>
    </>
  );
}
