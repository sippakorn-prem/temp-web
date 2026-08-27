"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { AppLayout } from "@/components/app-layout";
import {
  SETTINGS_SECTIONS,
  SettingsNav,
  type SettingsSection,
} from "@/components/settings/settings-nav";
import { ContactSection } from "@/components/settings/sections/contact-section";
import { KycSection } from "@/components/settings/sections/kyc-section";
import { PayoutSection } from "@/components/settings/sections/payout-section";
import { PreferencesSection } from "@/components/settings/sections/preferences-section";
import { PrivacySection } from "@/components/settings/sections/privacy-section";
import { ProfileSection } from "@/components/settings/sections/profile-section";
import { SecuritySection } from "@/components/settings/sections/security-section";
import { usePayout } from "@/hooks/use-payout";
import { card, note } from "@/lib/ui";

const PANELS: Record<SettingsSection, () => React.ReactElement> = {
  profile: ProfileSection,
  contact: ContactSection,
  security: SecuritySection,
  preferences: PreferencesSection,
  payout: PayoutSection,
  privacy: PrivacySection,
  kyc: KycSection,
};

/**
 * Account settings (DESIGN-BRIEFS.md brief 5).
 *
 * Sticky sub-navigation beside one panel, rather than tabs across the top: the sections
 * differ enormously in density — a two-field profile form next to a device list next to a
 * danger zone — and a tab strip would either overflow or force every section to pretend it
 * is the same size as its neighbours.
 *
 * Sections are client state rather than routes. Each one is a small read of already-loaded
 * user data, so a navigation per section would buy addressability at the cost of a page
 * transition every time someone glances at the next thing down the list.
 */
export default function AccountClientPage() {
  const t = useTranslations("settings");
  const searchParams = useSearchParams();
  const [section, setSection] = React.useState<SettingsSection>(() => {
    const requested = searchParams.get("section");
    return SETTINGS_SECTIONS.includes(requested as SettingsSection)
      ? (requested as SettingsSection)
      : "profile";
  });
  const { isLoaded, user } = useUser();
  const payout = usePayout();

  const contactNeedsAttention =
    isLoaded &&
    (user?.primaryEmailAddress?.verification.status !== "verified" ||
      user?.primaryPhoneNumber?.verification.status !== "verified");
  const payoutNeedsAttention =
    payout.isSuccess && ["none", "rejected"].includes(payout.data?.status ?? "none");
  const attention: SettingsSection[] = [
    ...(contactNeedsAttention ? (["contact"] as const) : []),
    ...(payoutNeedsAttention ? (["payout"] as const) : []),
  ];

  const Panel = PANELS[section];

  return (
    <AppLayout
      // Contact & verification is on this page, one click away in the sub-nav. The chrome
      // banner would be pointing at a section the user is already standing in.
      hideSetupNotice
      toolbar={<h1 className="text-[26px] font-bold tracking-[-0.02em]">{t("title")}</h1>}
    >
      <div className="mt-5 grid items-start gap-7 md:grid-cols-[236px_minmax(0,1fr)]">
        <SettingsNav
          active={section}
          onSelect={setSection}
          attention={attention}
          loading={!isLoaded || payout.isPending}
        />

        <div className="min-w-0">
          {isLoaded ? (
            <>
              <div className="mb-4.5">
                <h2 className="text-[19px] font-bold tracking-[-0.01em]">
                  {t(`sections.${section}.title`)}
                </h2>
                <p className={cn(note, "mt-1 text-[13.5px]")}>
                  {t(`sections.${section}.subtitle`)}
                </p>
              </div>
              <Panel />
            </>
          ) : (
            <PanelSkeleton />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

/** Holds the panel's shape while Clerk resolves, so the sub-nav doesn't jump. */
function PanelSkeleton() {
  return (
    <>
      <Skeleton className="mb-2 h-6 w-55" />
      <Skeleton className="mb-5 h-3.5 w-85" />
      <div className={cn(card, "grid gap-4.5")}>
        <Skeleton className="h-13" />
        <Skeleton className="h-13" />
        <Skeleton className="h-13" />
      </div>
    </>
  );
}
