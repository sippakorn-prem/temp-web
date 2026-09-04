import { getTranslations } from "next-intl/server";
import { Reveal } from "./reveal";
import { ScrollProgress } from "./scroll-progress";

// CSS controls responsive display height; intrinsic dimensions preserve each logo's ratio.
const LOGOS = [
  { src: "/payments/promptpay.png", alt: "PromptPay", w: 422, h: 160 },
  { src: "/payments/visa.png", alt: "Visa", w: 276, h: 112 },
  { src: "/payments/mastercard.png", alt: "Mastercard", w: 200, h: 156 },
  { src: "/payments/unionpay.png", alt: "UnionPay", w: 234, h: 147 },
  { src: "/payments/jcb.png", alt: "JCB", w: 224, h: 172 },
];

export async function PaymentLogos() {
  const t = await getTranslations("landing.pay");
  return (
    <ScrollProgress id="pay" className="sd-blk sd-pay">
      <div className="sd-wrap">
        <Reveal>
          <span className="sd-kicker" style={{ justifyContent: "center" }}>{t("kicker")}</span>
          <h2 className="sd-h2">{t("h")}</h2>
        </Reveal>
        <Reveal stagger className="sd-pay__logos">
          {LOGOS.map((l) => (
            // eslint-disable-next-line @next/next/no-img-element -- static brand marks, varied ratios
            <img key={l.alt} src={l.src} alt={l.alt} width={l.w} height={l.h} loading="lazy" decoding="async" />
          ))}
        </Reveal>
      </div>
    </ScrollProgress>
  );
}
