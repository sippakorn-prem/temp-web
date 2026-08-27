import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ds";
import { Brand } from "@/components/brand";
import { LanguageToggle } from "./language-toggle";
import { StickyHeader } from "./sticky-header";

// Sticky landing header: keep the choice architecture deliberately small — brand, locale,
// returning-user access, and one clear path into a new deal.
export async function LandingHeader() {
  const t = await getTranslations("landing.nav");
  return (
    <StickyHeader>
      <div className="sd-wrap sd-header__in">
        <Link href="#top" className="no-underline" aria-label="SafeDeal">
          <Brand className="sd-header__brand text-[19px]" />
        </Link>

        <div className="sd-header__cta">
          <LanguageToggle label={t("language")} className="sd-header__language" />
          <Button asChild variant="ghost" className="hidden whitespace-nowrap sm:inline-flex">
            <Link href="/sign-in">{t("signIn")}</Link>
          </Button>
          <Button asChild className="sd-header__primary whitespace-nowrap">
            <Link href="/sign-up">{t("start")}</Link>
          </Button>
        </div>
      </div>
    </StickyHeader>
  );
}
