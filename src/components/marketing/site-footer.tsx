import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("landing.footer");
  return (
    <footer className="sd-foot">
      <div className="sd-wrap sd-foot__in">
        <span>{t("copyright")}</span>
        <span>
          <a href="/legal/privacy">{t("privacy")}</a>
          <a href="/legal/terms">{t("terms")}</a>
          <a href="/status">{t("status")}</a>
        </span>
      </div>
    </footer>
  );
}
