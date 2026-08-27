import { getTranslations } from "next-intl/server";
import { DealScreen, type FlowState } from "./deal-screen";
import { FlowStage } from "./flow-stage";

const STATES: FlowState[] = ["pay", "held", "shipped", "check", "done"];

export async function FlowSection() {
  const t = await getTranslations("landing.flow");
  const caps = [t("cap0"), t("cap1"), t("cap2"), t("cap3"), t("cap4")];
  // The five phone screens are the real server-rendered deal-room snapshots the diorama crossfades.
  const screens = STATES.map((state) => <DealScreen key={state} state={state} />);

  return (
    <FlowStage
      kicker={t("kicker")}
      defaultTitle={t("h")}
      caps={caps}
      screens={screens}
      actors={{
        buyer: t("railBuyer"), safedeal: t("railSd"), seller: t("railSeller"),
        buyerRole: t("buyerRole"), sellerRole: t("sellerRole"),
      }}
    />
  );
}
