import { getTranslations } from "next-intl/server";
import { TrustSlider, type TrustItem } from "./trust-slider";

export async function TrustSection() {
  const t = await getTranslations("landing.trust");
  const items: TrustItem[] = [
    { icon: "licensed", h: t("i0h"), b: t("i0b") },
    { icon: "refund", h: t("i1h"), b: t("i1b") },
    { icon: "verified", h: t("i2h"), b: t("i2b") },
    { icon: "audit", h: t("i3h"), b: t("i3b") },
    { icon: "encrypted", h: t("i4h"), b: t("i4b") },
    { icon: "ruling", h: t("i5h"), b: t("i5b") },
  ];
  return <TrustSlider kicker={t("kicker")} heading={t("h")} lead={t("lead")} items={items} />;
}
