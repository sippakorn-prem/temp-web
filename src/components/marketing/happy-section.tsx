import { getTranslations } from "next-intl/server";
import { Reveal } from "./reveal";

/**
 * The bright "payoff" section that lands right after the dark "neither of you goes first" pivot —
 * the emotional exhale. Real, warm photos of buyers, sellers and two strangers finishing a deal
 * happily, contrasting the cold "problem" scenes above. Server-rendered copy; only the rise-in is
 * client (<Reveal>), so a soft locale nav never depends on the root messages provider.
 */
export async function HappySection() {
  const t = await getTranslations("landing.happy");
  const cards = [
    { img: "/marketing/happy-buyer.jpg", label: t("buyerLabel"), cap: t("buyerCap"), alt: t("buyerAlt") },
    { img: "/marketing/happy-seller.jpg", label: t("sellerLabel"), cap: t("sellerCap"), alt: t("sellerAlt") },
    { img: "/marketing/happy-trust.jpg", label: t("trustLabel"), cap: t("trustCap"), alt: t("trustAlt") },
  ];

  return (
    <section className="sd-happy" aria-label={t("h")}>
      <div className="sd-wrap">
        <div className="sd-happy__head">
          <Reveal>
            <span className="sd-kicker">{t("kicker")}</span>
          </Reveal>
          <Reveal>
            <h2 className="sd-h2">{t("h")}</h2>
          </Reveal>
          <Reveal>
            <p className="sd-lead">{t("lead")}</p>
          </Reveal>
        </div>

        <Reveal stagger className="sd-happy__grid">
          {cards.map((c) => (
            <figure className="sd-happy__card" key={c.img}>
              <div className="sd-happy__img">
                {/* eslint-disable-next-line @next/next/no-img-element -- static marketing photo, fixed frame */}
                <img src={c.img} alt={c.alt} width={1500} height={1000} loading="lazy" decoding="async" />
              </div>
              <figcaption className="sd-happy__cap">
                <span className="sd-happy__label">{c.label}</span>
                <p>{c.cap}</p>
              </figcaption>
            </figure>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
