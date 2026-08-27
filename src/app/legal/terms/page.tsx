import { getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/legal-document";

export default async function TermsPage() {
  const t = await getTranslations("legal");
  return <LegalDocument title={t("terms.title")} updated={t("updated")} intro={t("terms.intro")} sections={t.raw("terms.sections")} back={t("back")} />;
}
