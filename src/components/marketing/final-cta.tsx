import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Reveal } from "./reveal";
import { ScrollProgress } from "./scroll-progress";

export async function FinalCta() {
  const t = await getTranslations("landing.finalCta");
  return (
    <ScrollProgress className="sd-blk sd-final">
      <div className="sd-wrap">
        <Reveal>
          <div className="sd-ctafinal">
            <div className="grid-bg" aria-hidden />
            <h2>{t("h")}</h2>
            <p>{t("sub")}</p>
            <Link
              href="/sign-up"
              className="mt-[26px] inline-flex h-[52px] items-center rounded-full bg-white px-7 text-[16px] font-semibold text-primary no-underline transition-transform hover:-translate-y-0.5"
            >
              {t("start")}
            </Link>
            <p className="foot">{t("foot")}</p>
          </div>
        </Reveal>
      </div>
    </ScrollProgress>
  );
}
