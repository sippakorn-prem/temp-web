"use client";

import { useTranslations } from "next-intl";
import { Badge, EmptyState } from "@/components/ds";
import { icons } from "@/components/icon";
import { card } from "@/lib/ui";

/**
 * Buyer-side KYC, phase 2.
 *
 * Sellers are already covered by Omise's recipient onboarding; buyer identity checks come
 * later, to raise limits and unlock high-value deals. The section exists now so the page
 * doesn't reshape around it when it lands.
 */
export function KycSection() {
  const t = useTranslations("settings.kyc");

  return (
    <div className={card}>
      <EmptyState
        icon={icons.protection}
        title={t("title")}
        className="min-h-50"
        action={<Badge variant="terminal">{t("comingSoon")}</Badge>}
      >
        {t("body")}
      </EmptyState>
    </div>
  );
}
