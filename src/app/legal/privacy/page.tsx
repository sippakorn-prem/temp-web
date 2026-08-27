import { getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/legal-document";

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  return <LegalDocument title={t("privacy.title")} updated={t("updated")} intro={t("privacy.intro")} sections={t.raw("privacy.sections")} back={t("back")} />;
}
