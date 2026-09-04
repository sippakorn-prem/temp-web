import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ds";
import { Reveal } from "./reveal";
import { DealPreview } from "./deal-preview";
import { ScrollProgress } from "./scroll-progress";

/**
 * Split hero: the pitch on the left, a phone showing the real product — a deal held in escrow —
 * on the right (DealPreview), over a light dot-grid background. Copy rises in via Reveal.
 */
export async function Hero() {
  const t = await getTranslations("landing.hero");

  return (
    <ScrollProgress id="top" className="sd-hero sd-hero--split">
      <div className="sd-mesh" aria-hidden>
        <span className="m1" />
        <span className="m2" />
        <span className="m3" />
      </div>

      <div className="sd-wrap sd-hero__grid">
        <div className="sd-hero__copy">
          <Reveal>
            <span className="sd-eyebrow">{t("eyebrow")}</span>
          </Reveal>
          <Reveal>
            <h1 className="sd-h1">
              <span className="sd-h1__line">{t("h1")}</span>
              <span className="sd-h1__line g">{t("h2")}</span>
            </h1>
          </Reveal>
          <Reveal>
            <p className="sd-hero__lead">{t("lead")}</p>
          </Reveal>
          <Reveal stagger className="sd-chips">
            {["c1", "c2", "c3"].map((k) => (
              <span key={k} className="sd-chip">
                <span className="tick" aria-hidden>
                  <Check />
                </span>
                {t(k)}
              </span>
            ))}
          </Reveal>

          <Reveal className="sd-hero__actions">
            <Button asChild size="lg" className="sd-hero__primary">
              <Link href="/sign-up">
                {t("ctaStart")}
                <Arrow />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="sd-hero__secondary">
              <Link href="#flow">{t("ctaHow")}</Link>
            </Button>
          </Reveal>

        </div>

        <Reveal className="sd-hero__demo">
          <DealPreview />
        </Reveal>
      </div>
    </ScrollProgress>
  );
}

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg className="sd-hero__arrow" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
