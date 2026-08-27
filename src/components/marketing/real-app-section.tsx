import { getTranslations } from "next-intl/server";
import { FeatureShowcase, type FeatureStory, type FeatureShowcaseUi } from "./feature-showcase";

/**
 * Resolves the localized product story on the server. The interactive controller receives plain
 * strings so locale changes on the marketing route never depend on the root messages provider.
 */
export async function RealAppSection() {
  const t = await getTranslations("landing");
  const features: FeatureStory[] = [
    {
      icon: "protection",
      label: t("realapp.features.funds.label"),
      title: t("realapp.features.funds.title"),
      body: t("realapp.features.funds.body"),
    },
    {
      icon: "check",
      label: t("realapp.features.action.label"),
      title: t("realapp.features.action.title"),
      body: t("realapp.features.action.body"),
    },
    {
      icon: "history",
      label: t("realapp.features.record.label"),
      title: t("realapp.features.record.title"),
      body: t("realapp.features.record.body"),
    },
    {
      icon: "support",
      label: t("realapp.features.support.label"),
      title: t("realapp.features.support.title"),
      body: t("realapp.features.support.body"),
    },
  ];
  const ui: FeatureShowcaseUi = {
    amount: "฿12,500",
    deliveryAction: t("realapp.ui.deliveryAction"),
    deliveryPopup: t("realapp.ui.deliveryPopup"),
    problemLabel: t("realapp.ui.problemLabel"),
    evidenceFlowLabel: t("realapp.ui.evidenceFlowLabel"),
    supportPill: t("realapp.ui.supportPill"),
    rail: [
      t("card.railAgreed"),
      t("card.railPaid"),
      t("card.railHeld"),
      t("card.railShipped"),
      t("card.railDone"),
    ],
  };

  return (
    <FeatureShowcase
      kicker={t("realapp.kicker")}
      heading={t("realapp.h")}
      lead={t("realapp.lead")}
      features={features}
      ui={ui}
    />
  );
}
