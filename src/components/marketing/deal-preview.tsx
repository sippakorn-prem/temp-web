import { getTranslations } from "next-intl/server";
import { Badge, EscrowTimeline } from "@/components/ds";
import { formatBaht } from "@/lib/money";
import { cn } from "@/lib/ds-utils";
import { card, code as codeClass, money, note } from "@/lib/ui";
import { PhoneFrame } from "./phone-frame";

/**
 * A faithful, static marketing snapshot of the real deal room ([deal-detail.tsx]) in the funded /
 * "held" state, buyer's view, shown inside a phone for the hero. It mirrors the real screen on
 * purpose — same DS parts (Badge, EscrowTimeline), same `card/note/money/code` recipes, the same
 * blue `info` held banner and copy from the `deal` namespace — so it reads as the product, not an
 * invented card. It is presentation only: no data, no hooks, no backend (marketing fixture, never
 * authoritative deal state). Numbers are hard-coded; the amount is satang, like the real deal.
 */
const AMOUNT_SATANG = 1_250_000; // ฿12,500
const DEAL_CODE = "SD-XXXXXX"; // placeholder, not a real deal code

export async function DealPreview() {
  const t = await getTranslations("landing.card");
  const td = await getTranslations("deal");
  const amount = formatBaht(AMOUNT_SATANG);
  const title = t("itemTitle");

  const steps = [
    { id: "created", state: "done" as const, title: td("timelineEvents.created") },
    { id: "terms", state: "done" as const, title: td("timelineEvents.terms_accepted") },
    { id: "funded", state: "done" as const, title: td("timelineEvents.funded") },
    { id: "stage", state: "current" as const, title: td("stages.funded"), detail: td("history.inProgress") },
  ];

  return (
    <div className="sd-phone" aria-hidden>
      <div className="sd-phone__frame">
        <div className="sd-phone__screen">
          <div className="sd-phone__status">
            <span className="sd-phone__time">9:41</span>
            <span className="sd-phone__sig">
              <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7.5" width="3" height="3.5" rx="1" /><rect x="4.6" y="5" width="3" height="6" rx="1" /><rect x="9.3" y="2.5" width="3" height="8.5" rx="1" /><rect x="14" y="0" width="3" height="11" rx="1" /></svg>
              <svg width="16" height="11" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2C5 2 2.4 3.1.6 5l1.4 1.4C3.4 5 5.6 4 8 4s4.6 1 6 2.4L15.4 5C13.6 3.1 11 2 8 2Zm0 3.6c-1.6 0-3.1.6-4.2 1.7l1.4 1.4c.8-.8 1.8-1.2 2.8-1.2s2 .4 2.8 1.2l1.4-1.4C11.1 6.2 9.6 5.6 8 5.6ZM8 9l-1.4 1.4c.4.4.9.6 1.4.6s1-.2 1.4-.6L8 9Z" /></svg>
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" strokeOpacity="0.4" /><rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" /><path d="M23 4c0.9 0.4 0.9 3.6 0 4z" fill="currentColor" fillOpacity="0.5" /></svg>
            </span>
          </div>
          <div className="sd-phone__bar">
            <span className="sd-phone__brand">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny brand mark */}
              <img src="/marketing/brand-mark.png" alt="" width={18} height={18} />
              SafeDeal
            </span>
            <span className="sd-phone__ava">S</span>
          </div>

          <div className="sd-phone__app">
            <p className="text-[12px] font-bold text-primary">{td("kicker")}</p>
            <h1 className="mt-1 text-[19px] font-bold leading-tight tracking-[-0.02em]">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={codeClass}>{DEAL_CODE}</span>
              <Badge variant="info">{td("stages.funded")}</Badge>
            </div>

            <div className="sd-phone__held mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-info-border bg-info-bg px-3.5 py-3">
              <div className="min-w-0">
                <strong className="text-[13px]">{td("held.label")}</strong>
                <p className={cn(note, "mt-0.5 text-[11px]")}>{td("held.body")}</p>
              </div>
              <div className={cn(money, "text-[18px] text-info")}>{amount}</div>
            </div>

            <article className={cn(card, "mt-3 p-3.5")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static deal media */}
              <img className="mb-3 h-[130px] w-full rounded-lg object-cover" src="/marketing/deal-camera.jpg" alt={t("mediaAlt")} width={1000} height={750} loading="lazy" decoding="async" />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <Badge variant="info">{td("viewingAs", { role: td("buyer") })}</Badge>
                  <h2 className="mt-2 text-[15px] font-bold tracking-[-0.02em]">{title}</h2>
                  <p className={cn(note, "mt-1 text-[11px]")}>
                    {DEAL_CODE} · {td("buyingFrom", { name: t("sellerName") })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={cn(note, "text-[11px]")}>{td("itemAmount")}</span>
                  <div className={cn(money, "mt-0.5 text-[15px]")}>{amount}</div>
                </div>
              </div>
            </article>

            <section className={cn(card, "mt-3 p-3.5")}>
              <h3 className="text-[13px] font-bold">{td("history.title")}</h3>
              <p className={cn(note, "mt-0.5 text-[11px]")}>{td("history.subtitle")}</p>
              <div className="mt-3">
                <EscrowTimeline label={td("timelineLabel")} steps={steps} />
              </div>
            </section>
          </div>
        </div>
        <PhoneFrame className="sd-phone__device" id="hero" />
      </div>
    </div>
  );
}
