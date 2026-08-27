import { getTranslations } from "next-intl/server";
import { ProblemScenes, type ProblemScene } from "./problem-scenes";

// Server wrapper: resolves copy and hands plain strings to the client scene controller (so the
// interactive part never depends on the root messages provider, which a soft locale nav does not
// refresh — see web/CONVENTIONS.md i18n).
export async function ProblemSection() {
  const t = await getTranslations("landing.problem");
  const scenes: ProblemScene[] = [
    { dir: "left", tag: t("tag"), h: t("buyerH"), b: t("buyerB"), img: "/marketing/problem-buyer.jpg", alt: t("imgBuyerAlt") },
    { dir: "right", tag: t("tag"), h: t("sellerH"), b: t("sellerB"), img: "/marketing/problem-seller.jpg", alt: t("imgSellerAlt") },
  ];
  return <ProblemScenes scenes={scenes} resolvePre={t("resolvePre")} resolveAccent={t("resolveAccent")} />;
}
