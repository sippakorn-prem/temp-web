"use client";

import { useTranslations } from "next-intl";
import { Badge, Skeleton } from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { Icon, type IconName } from "@/components/icon";

export const SETTINGS_SECTIONS = [
  "profile",
  "contact",
  "security",
  "preferences",
  "payout",
  "privacy",
  "kyc",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const ICONS: Record<SettingsSection, IconName> = {
  profile: "user",
  contact: "chat",
  security: "protection",
  preferences: "settings",
  payout: "payment",
  privacy: "file",
  kyc: "complete",
};

/**
 * Buyer KYC is phase 2. The row exists so the page doesn't reshape when it lands, and it
 * stays clickable — the design greys it out, but a dead row tells a user nothing, whereas
 * the panel behind it explains what KYC will buy them and when.
 */
const UPCOMING: SettingsSection[] = ["kyc"];

/**
 * The settings sub-navigation.
 *
 * A vertical list rather than a tab strip: six sections of wildly different density — two
 * short forms, a long session list, a danger zone — would overflow a single strip, and
 * every section stays addressable at a glance. It also absorbs the future KYC row without
 * anything above it having to move.
 */
export function SettingsNav({
  active,
  onSelect,
  attention = [],
  loading = false,
}: {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
  attention?: SettingsSection[];
  loading?: boolean;
}) {
  const t = useTranslations("settings");

  return (
    <nav aria-label={t("navLabel")} className="sticky top-4 grid gap-[3px]">
      {loading
        ? SETTINGS_SECTIONS.map((id) => <Skeleton key={id} className="h-10 rounded-lg" />)
        : SETTINGS_SECTIONS.map((id) => {
            const selected = id === active;
            const upcoming = UPCOMING.includes(id);
            const needsAttention = attention.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => onSelect(id)}
                className={cn(
                  "relative flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-3 text-left text-[13.5px] font-medium transition-colors before:pointer-events-none before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full hover:bg-muted",
                  selected &&
                    "border-primary/20 bg-accent font-bold text-accent-foreground shadow-xs before:bg-primary hover:bg-accent"
                )}
              >
                <Icon name={ICONS[id]} className="size-[17px]" />
                <span className="min-w-0 flex-1 truncate">{t(`sections.${id}.nav`)}</span>
                {upcoming ? (
                  <Badge
                    variant="terminal"
                    className="shrink-0 px-[7px] py-[2px] text-[11px] whitespace-nowrap"
                  >
                    {t("comingSoon")}
                  </Badge>
                ) : null}
                {needsAttention ? (
                  <Badge
                    variant="warning"
                    aria-label={t("actionRequired")}
                    className="min-w-5.5 shrink-0 justify-center px-1.5 py-[2px] text-[11px]"
                  >
                    !
                  </Badge>
                ) : null}
              </button>
            );
          })}
    </nav>
  );
}
